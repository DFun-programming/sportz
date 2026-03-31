import { Router } from "express";
import { matchIdParamSchema } from "../validation/matches.js";
import { createCommentarySchema, listCommentaryQuerySchema } from "../validation/commentry.js";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import { desc, eq } from "drizzle-orm";
const MAX_LIMIT = 100; 
export const commentaryRouter = Router({ mergeParams: true });

commentaryRouter.get('/', async (req, res) => {
  try {
    // ── 1. Validate route params ──────────────────────────────────────────────
    const paramsResult = matchIdParamSchema.safeParse(req.params);

    if (!paramsResult.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid route parameters',
        errors: paramsResult.error.flatten().fieldErrors,
      });
    }

    const { id } = paramsResult.data;

    // ── 2. Validate query string ──────────────────────────────────────────────
    const queryResult = listCommentaryQuerySchema.safeParse(req.query);

    if (!queryResult.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid query parameters',
        errors: queryResult.error.flatten().fieldErrors,
      });
    }

    // Apply MAX_LIMIT as a hard safety cap regardless of what Zod allows
    const limit = Math.min(queryResult.data.limit ?? 50, MAX_LIMIT);

    // ── 3. Query the commentary table ─────────────────────────────────────────
    const rows = await db
      .select()
      .from(commentary)
      .where(eq(commentary.matchId, id))
      .orderBy(desc(commentary.createdAt))
      .limit(limit);

    // ── 4. Return results ─────────────────────────────────────────────────────
    return res.status(200).json({
      status: 'success',
      data: rows,
      meta: {
        matchId:id,
        count: rows.length,
        limit,
      },
    });
  } catch (err) {
    console.error('[GET /commentary] Unexpected error:', err);

    return res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred. Please try again later.',
    });
  }
});

commentaryRouter.post('/', async (req, res) => {
  try {
    // ── 1. Validate route params ────────────────────────────────────────────
    const paramsResult = matchIdParamSchema.safeParse(req.params);
  
    if (!paramsResult.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid route parameters',
        errors: paramsResult.error.flatten().fieldErrors,
      });
    }

    const { id } = paramsResult.data;

    // ── 2. Validate request body ────────────────────────────────────────────
    const bodyResult = createCommentarySchema.safeParse(req.body);
  
    if (!bodyResult.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request body',
        errors: bodyResult.error.flatten().fieldErrors,
      });
    }

    const {
      minute,
      sequence,
      period,
      eventType,
      actor,
      team,
      message,
      metadata,
      tags,
    } = bodyResult.data;

    // ── 3. Insert into the commentary table ─────────────────────────────────
    const [inserted] = await db
      .insert(commentary)
      .values({
        matchId:id,
        minute,
        sequence,
        period,
        eventType,
        actor,
        team,
        message,
        // Drizzle expects JSON columns to receive plain JS objects / arrays
        metadata: metadata ?? null,
        tags:     tags     ?? null,
      })
      .returning();

    if (typeof res.app.locals.broadcastCommentry === 'function') {
          try {
              res.app.locals.broadcastCommentry(id,inserted);
          } catch (err) {
              console.error('broadcastCommentry failed', err);
          }
      }
    // ── 4. Return the created record ────────────────────────────────────────
    return res.status(201).json({
      status: 'success',
      data: inserted,
    });
  } catch (err) {
    console.error('[POST /commentry] Unexpected error:', err);

    return res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred. Please try again later.',
    });
  }
});
