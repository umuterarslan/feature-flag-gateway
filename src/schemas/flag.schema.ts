import { z } from 'zod';

const uuidFormatError = 'Must be in UUID format';
const KEY_REGEX = /^[a-zA-Z0-9_-]+$/;

const baseFeatureFlagSchema = z
    .object({
        key: z
            .string()
            .min(1, 'Key field is required')
            .regex(KEY_REGEX, 'Key field can only contain a-zA-Z0-9_-'),
        enabled: z.boolean(),
        conditions: z.record(z.string(), z.any()),
    })
    .strict();

export const createFeatureFlagSchema = baseFeatureFlagSchema.extend({
    enabled: z.boolean(),
    conditions: z.any().default({}),
});

export const updateFeatureFlagSchema = baseFeatureFlagSchema.partial();

export const getAllFeatureFlagsSchema = z.object({
    cursor: z.uuid(uuidFormatError).optional(),
    limit: z.coerce.number().min(1).max(100).default(10),
});

export const flagIdParamsSchema = z.object({ id: z.uuid(uuidFormatError) });
