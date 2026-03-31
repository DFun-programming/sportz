# Sportz 🏆

A production-grade, real-time sports data backend built with **Node.js**, **Express 5**, and **WebSockets**. Sportz provides a low-latency REST + WebSocket hybrid API for managing live matches, streaming commentary, and broadcasting score updates to connected clients in real time.

---

## Features

- **Hybrid HTTP + WebSocket server** — REST and WebSocket run on the same HTTP server instance, sharing a single port
- **Real-time match broadcasting** — new matches and score updates are instantly pushed to all connected WebSocket clients
- **Live commentary streaming** — structured commentary events (minute, period, actor, event type, metadata) streamed per match
- **Automatic match status resolution** — match status (`scheduled` / `live` / `finished`) is derived from `startTime` and `endTime` at creation time
- **Production-grade WebSocket management** — heartbeat/ping-pong every 30s to detect and terminate stale connections, backpressure-aware sending
- **Request security via Arcjet** — bot detection, sliding window rate limiting (5 req/2s), and shield protection applied to both HTTP and WebSocket connections
- **Type-safe data layer** — PostgreSQL with Drizzle ORM, strict Zod validation on all inputs, automated migrations

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM) |
| HTTP Framework | Express 5 |
| WebSocket | `ws` |
| Database | PostgreSQL |
| ORM | Drizzle ORM |
| Validation | Zod |
| Security | Arcjet (bot detection, rate limiting, shield) |
| Dev Tools | drizzle-kit, nodemon |

---

## Project Structure

```
sportz/
├── src/
│   ├── index.js              # App entry — creates HTTP server, mounts routes, attaches WS
│   ├── arcjet.js             # Arcjet config for HTTP middleware and WS connection guard
│   ├── db/
│   │   ├── db.js             # Drizzle + pg connection
│   │   └── schema.js         # Table definitions: matches, commentary
│   ├── routes/
│   │   └── matches.js        # GET /matches, POST /matches
│   ├── utils/
│   │   └── match-status.js   # Derives match status from timestamps
│   ├── validation/
│   │   └── matches.js        # Zod schemas for create, list, update
│   └── ws/
│       └── server.js         # WebSocket server — connection lifecycle, ping/pong, broadcast
├── drizzle/
│   └── 0000_third_scalphunter.sql  # Initial migration
├── drizzle.config.ts
└── package.json
```

---

## Database Schema

### `matches`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, auto-generated |
| `sport` | varchar(100) | e.g. `"football"`, `"cricket"` |
| `home_team` | varchar(150) | |
| `away_team` | varchar(150) | |
| `status` | enum | `scheduled` / `live` / `finished` |
| `start_time` | timestamptz | |
| `end_time` | timestamptz | |
| `home_score` | integer | Default 0 |
| `away_score` | integer | Default 0 |
| `created_at` | timestamptz | |

### `commentary`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `match_id` | uuid | FK → matches (cascade delete) |
| `minute` | integer | Match minute |
| `sequence` | integer | Ordering key |
| `period` | varchar | e.g. `"first_half"` |
| `event_type` | varchar | e.g. `"goal"`, `"yellow_card"` |
| `actor` | varchar | Player or team name |
| `message` | varchar(1000) | Commentary text |
| `metadata` | jsonb | Arbitrary event data |

Indexes: `commentary_match_id_idx`, `commentary_match_sequence_idx`

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- An [Arcjet](https://arcjet.com) account and API key

### Installation

```bash
git clone https://github.com/DFun-Programming/sportz
cd sportz
npm install
```

### Environment Variables

Create a `.env` file in the root:

```env
PORT=8000
HOST=0.0.0.0

DATABASE_URL=postgresql://user:password@localhost:5432/sportz

ARCJET_KEY=your_arcjet_api_key
ARCJET_MODE=DRY_RUN   # Use LIVE in production
```

### Database Setup

```bash
# Generate migration files
npm run db:generate

# Apply migrations
npm run db:migrate

# (Optional) Open Drizzle Studio to inspect data
npm run db:studio
```

### Running

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

The server starts on `http://localhost:8000`.  
WebSocket endpoint: `ws://localhost:8000/ws`

---

## API Reference

### REST Endpoints

#### `GET /matches`
Returns a list of matches ordered by creation time.

**Query params:**
| Param | Type | Default | Max |
|---|---|---|---|
| `limit` | integer | 50 | 100 |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "sport": "football",
      "homeTeam": "Arsenal",
      "awayTeam": "Chelsea",
      "status": "live",
      "homeScore": 2,
      "awayScore": 1,
      "startTime": "2026-04-01T15:00:00Z",
      "endTime": "2026-04-01T17:00:00Z",
      "createdAt": "2026-04-01T14:50:00Z"
    }
  ]
}
```

#### `POST /matches`
Creates a new match. Match status is automatically resolved from `startTime` and `endTime`.

**Request body:**
```json
{
  "sport": "football",
  "homeTeam": "Arsenal",
  "awayTeam": "Chelsea",
  "startTime": "2026-04-01T15:00:00Z",
  "endTime": "2026-04-01T17:00:00Z",
  "homeScore": 0,
  "awayScore": 0
}
```

**Validation rules:**
- `startTime` and `endTime` must be valid ISO 8601 strings
- `endTime` must be after `startTime`
- Scores default to `0` if omitted

On success, the new match is broadcast to all connected WebSocket clients.

**Response:** `201 Created` with the created match object.

---

### WebSocket

Connect to `ws://localhost:8000/ws`.

On connection, the server sends a welcome event:
```json
{ "type": "welcome" }
```

#### Server → Client Events

| Event | Payload | Trigger |
|---|---|---|
| `welcome` | `{}` | On connection |
| `match_created` | `{ type: "match_created", data: match }` | When `POST /matches` succeeds |

#### Connection Management
- Ping sent every **30 seconds** to all clients
- Clients that fail to respond with a pong are **terminated**
- Arcjet rate limiting and bot detection applied on WebSocket handshake

---

## Security

Arcjet protection is applied to all HTTP requests and WebSocket connections:

| Rule | Config |
|---|---|
| Shield | Blocks common attack patterns |
| Bot detection | Blocks all bots except search engines, uptime monitors, and link previewers |
| Rate limiting | Sliding window — 5 requests per 2 seconds |

Set `ARCJET_MODE=DRY_RUN` to log decisions without blocking (useful for development).

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start with file watching |
| `npm start` | Start in production mode |
| `npm run db:generate` | Generate Drizzle migration files |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:push` | Push schema directly (dev only) |
| `npm run db:studio` | Open Drizzle Studio |
