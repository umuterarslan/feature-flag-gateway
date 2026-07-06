import type { Prisma } from '@prisma/client';
import { z } from 'zod';

const uuidFormatError = 'Must be in UUID format';

const baseFeatureFlagSchema = z.object({
    key: z
        .string()
        .min(1, 'Key field is required')
        .regex(/^[a-zA-Z0-9_-]+$/, 'Key field can only contain a-zA-Z0-9_-'),
    enabled: z.boolean(),
    conditions: z.record(z.string(), z.unknown()).transform((val) => val as Prisma.InputJsonValue),
});

export const createFeatureFlagSchema = baseFeatureFlagSchema.extend({
    enabled: z.boolean().default(false),
    conditions: z
        .record(z.string(), z.unknown())
        .default({})
        .transform((val) => val as Prisma.InputJsonValue),
});

export const updateFeatureFlagSchema = baseFeatureFlagSchema.partial();

export const getAllFeatureFlagsSchema = z.object({
    cursor: z.uuid(uuidFormatError).optional(),
    limit: z.coerce.number().min(1).max(100).default(10),
});

export const flagIdParamsSchema = z.object({
    id: z.uuid(uuidFormatError),
});
