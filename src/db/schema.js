// src/db/schema.js

import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * ENUMS
 */

// match_status enum
export const matchStatusEnum = pgEnum("match_status", [
  "scheduled",
  "live",
  "finished",
]);

/**
 * TABLES
 */

// Matches table
export const matches = pgTable("matches", {
  id: uuid("id").defaultRandom().primaryKey(),

  sport: varchar("sport", { length: 100 }).notNull(),

  homeTeam: varchar("home_team", { length: 150 }).notNull(),
  awayTeam: varchar("away_team", { length: 150 }).notNull(),

  status: matchStatusEnum("status")
    .notNull()
    .default("scheduled"),

  startTime: timestamp("start_time", { withTimezone: true }),
  endTime: timestamp("end_time", { withTimezone: true }),

  homeScore: integer("home_score")
    .notNull()
    .default(0),

  awayScore: integer("away_score")
    .notNull()
    .default(0),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Commentary table
export const commentary = pgTable(
  "commentary",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),

    minute: integer("minute"),
    sequence: integer("sequence").notNull(),

    period: varchar("period", { length: 50 }),
    eventType: varchar("event_type", { length: 100 }),

    actor: varchar("actor", { length: 150 }),
    team: varchar("team", { length: 150 }),

    message: varchar("message", { length: 1000 }).notNull(),

    metadata: jsonb("metadata"),

    tags: varchar("tags", { length: 255 }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    matchIdx: index("commentary_match_id_idx").on(table.matchId),
    sequenceIdx: index("commentary_match_sequence_idx").on(
      table.matchId,
      table.sequence
    ),
  })
);