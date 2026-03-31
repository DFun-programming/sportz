import { z } from 'zod';

/**
 * Schema for validating query parameters when listing commentary entries.
 * - limit: optional coerced number, must be a positive integer, max value of 100
 */
export const listCommentaryQuerySchema = z.object({
  limit: z
    .coerce
    .number()
    .int('limit must be an integer')
    .positive('limit must be a positive number')
    .max(100, 'limit must not exceed 100')
    .optional(),
});

/**
 * Schema for validating the body when creating a new commentary entry.
 */
export const createCommentarySchema = z.object({
  /** Match minute (e.g. 45 for half-time, 0 for kick-off) */
  minute: z
    .number()
    .int('minute must be an integer')
    .nonnegative('minute must be 0 or greater'),

  /** Ordering sequence within the same minute */
  sequence: z
    .number()
    .int('sequence must be an integer')
    .nonnegative('sequence must be 0 or greater')
    .optional(),

  /** Match period identifier (e.g. "first_half", "second_half", "extra_time") */
  period: z
    .string()
    .min(1, 'period must not be empty'),

  /** Type of event (e.g. "goal", "yellow_card", "substitution") */
  eventType: z
    .string()
    .min(1, 'eventType must not be empty')
    .optional(),

  /** Primary actor involved in the event (e.g. player name or ID) */
  actor: z
    .string()
    .min(1, 'actor must not be empty')
    .optional(),

  /** Team associated with the event */
  team: z
    .string()
    .min(1, 'team must not be empty')
    .optional(),

  /** Human-readable commentary message (required) */
  message: z
    .string()
    .min(1, 'message is required and must not be empty'),

  /** Arbitrary key-value metadata for extensibility */
  metadata: z
    .record(z.string(), z.unknown())
    .optional(),

  /** Free-form tags for categorisation and filtering */
  tags: z
    .array(z.string().min(1, 'each tag must not be empty'))
    .optional(),
});