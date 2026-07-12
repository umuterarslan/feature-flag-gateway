import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/db.js';
import redisClient from '../config/redis.js';
import {
    createFeatureFlagSchema,
    getAllFeatureFlagsSchema,
    flagIdParamsSchema,
    updateFeatureFlagSchema,
} from '../schemas/flag.schema.js';
import { flagEvents } from '../utils/eventEmitter.js';
import { type AuthRequest } from '../middlewares/auth.middleware.js';

export const createFeatureFlag = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const validateData = createFeatureFlagSchema.parse(req.body);
    const { name, tenantId } = req.user;

    try {
        await prisma.tenant.upsert({
            where: { id: tenantId },
            update: {},
            create: { id: tenantId, name },
        });

        const flag = await prisma.featureFlag.create({
            data: {
                key: validateData.key,
                enabled: validateData.enabled,
                conditions: validateData.conditions,
                tenantId: tenantId,
            },
        });
        res.status(201).json({ success: true, data: flag });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

export const updateFeatureFlag = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = flagIdParamsSchema.parse(req.params);
        const tenantId = req.user.tenantId;

        const updateData = updateFeatureFlagSchema.parse(req.body);
        const cleanUpdateData = Object.fromEntries(
            Object.entries(updateData).filter(([_, value]) => value !== undefined)
        );

        const updateResult = await prisma.featureFlag.updateMany({
            where: { id, tenantId },
            data: cleanUpdateData,
        });

        if (updateResult.count === 0) {
            return res
                .status(404)
                .json({ success: false, message: 'Feature flag not found or unauthorized' });
        }

        const updatedFlag = await prisma.featureFlag.findUnique({
            where: { id },
        });

        if (updatedFlag) {
            await redisClient.del(`flag:${updatedFlag.key}`);

            flagEvents.emit('flag_updated', {
                key: updatedFlag.key,
                enabled: updatedFlag.enabled,
            });
        }

        res.json({ success: true, data: updatedFlag });
    } catch (error) {
        next(error);
    }
};

export const getAllFeatureFlags = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { cursor, limit } = getAllFeatureFlagsSchema.parse(req.query);
    const tenantId = req.user.tenantId;

    try {
        const flags = await prisma.featureFlag.findMany({
            where: { tenantId },
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

export const getFeatureFlagById = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { id } = flagIdParamsSchema.parse(req.params);
    const tenantId = req.user.tenantId;

    try {
        const flag = await prisma.featureFlag.findUniqueOrThrow({
            where: { id, tenantId },
        });
        res.json({ success: true, data: flag });
    } catch (error) {
        next(error);
    }
};
