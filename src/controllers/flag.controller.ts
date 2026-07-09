import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import redisClient from '../config/redis.js';
import {
    createFeatureFlagSchema,
    getAllFeatureFlagsSchema,
    flagIdParamsSchema,
    updateFeatureFlagSchema,
} from '../schemas/flag.schema.js';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { flagEvents } from '../utils/eventEmitter.js';

export const createFeatureFlag = async (req: Request, res: Response, next: NextFunction) => {
    const validateData = createFeatureFlagSchema.parse(req.body);

    try {
        const flag = await prisma.featureFlag.create({
            data: {
                key: validateData.key,
                enabled: validateData.enabled,
                conditions: validateData.conditions,
            },
        });
        res.status(201).json({ success: true, data: flag });
    } catch (error) {
        next(error);
    }
};

export const updateFeatureFlag = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = flagIdParamsSchema.parse(req.params);
        const updateData = updateFeatureFlagSchema.parse(req.body);
        const cleanUpdateData = Object.fromEntries(
            Object.entries(updateData).filter(([_, value]) => value !== undefined)
        );

        const update = await prisma.featureFlag.update({
            where: { id },
            data: cleanUpdateData,
        });
        await redisClient.del(`flag:${updateData.key}`);

        flagEvents.emit('flag_updated', {
            key: update.key,
            enabled: update.enabled,
        });
        res.json({ success: true, data: update });
    } catch (error) {
        next(error);
    }
};

export const getAllFeatureFlags = async (req: Request, res: Response, next: NextFunction) => {
    const { cursor, limit } = getAllFeatureFlagsSchema.parse(req.query);

    try {
        const flags = await prisma.featureFlag.findMany({
            take: limit,
            orderBy: { key: 'asc' },
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });
        let nextCursor: string | null = null;
        if (flags.length === limit) {
            nextCursor = flags[flags.length - 1]?.id || null;
        }
        res.json({ success: true, data: { flags, nextCursor } });
    } catch (error) {
        next(error);
    }
};

export const getFeatureFlagById = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = flagIdParamsSchema.parse(req.params);

    try {
        const flag = await prisma.featureFlag.findUniqueOrThrow({
            where: { id },
        });
        res.json({ success: true, data: flag });
    } catch (error) {
        next(error);
    }
};
