import { z } from "zod";

/**
 * -----------------------------------------
 * CONSTANTS
 * -----------------------------------------
 */

export const MATCH_STATUS = {
  SCHEDULED: "scheduled",
  LIVE: "live",
  FINISHED: "finished",
};

/**
 * -----------------------------------------
 * QUERY SCHEMAS
 * -----------------------------------------
 */

// Optional limit, coerced to number, positive integer, max 100
export const listMatchesQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .optional(),
});

/**
 * -----------------------------------------
 * PARAM SCHEMAS
 * -----------------------------------------
 */

// Required id as UUID
export const matchIdParamSchema = z.object({
  id: z.string().uuid(),
});

/**
 * -----------------------------------------
 * CREATE MATCH SCHEMA
 * -----------------------------------------
 */

export const createMatchSchema = z
  .object({
    sport: z.string().min(1, "Sport is required"),
    homeTeam: z.string().min(1, "Home team is required"),
    awayTeam: z.string().min(1, "Away team is required"),

    startTime: z.string(),
    endTime: z.string(),

    homeScore: z.coerce.number().int().min(0).optional(),
    awayScore: z.coerce.number().int().min(0).optional(),
  })
  // Validate ISO date strings
  .refine(
    (data) =>
      !isNaN(Date.parse(data.startTime)) &&
      !isNaN(Date.parse(data.endTime)),
    {
      message: "startTime and endTime must be valid ISO date strings",
      path: ["startTime"],
    }
  )
  // Ensure endTime > startTime
  .superRefine((data, ctx) => {
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "endTime must be after startTime",
        path: ["endTime"],
      });
    }
  });

/**
 * -----------------------------------------
 * UPDATE SCORE SCHEMA
 * -----------------------------------------
 */

export const updateScoreSchema = z.object({
  homeScore: z.coerce.number().int().min(0),
  awayScore: z.coerce.number().int().min(0),
});