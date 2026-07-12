import prisma from '../config/db.js';
import redisClient from '../config/redis.js';
import crypto from 'crypto';

export const getFeatureFlag = async (
    tenantId: string,
    key: string,
    context?: any
): Promise<boolean> => {
    try {
        const cacheKey = `flag:${tenantId}:${key}`;
        const cachedFlag = await redisClient.get(cacheKey);

        if (cachedFlag) {
            const flag = JSON.parse(cachedFlag);
            return evaluateConditions(flag, context);
        }

        const flag = await prisma.featureFlag.findUnique({
            where: {
                tenantId_key: {
                    tenantId,
                    key,
                },
            },
        });
        if (!flag) {
            console.error(`Feature flag with key "${key}" not found in cache and database.`);
            await redisClient.setEx(cacheKey, 30, 'null'); // cache the null result for 30 seconds to prevent repeated DB hits
            return false;
        }

        await redisClient.setEx(cacheKey, 3600, JSON.stringify(flag));
        return evaluateConditions(flag, context);
    } catch (error) {
        console.error('Error fetching feature flag from Redis:', error);
        return false;
    }
};

const evaluateConditions = (flag: any, context?: any): boolean => {
    if (!flag.enabled) return false;
    if (!flag.conditions || Object.keys(flag.conditions).length === 0) return true;
    if (!context) return false;

    if (flag.conditions.percentage !== undefined) {
        if (!context.userId) return false;

        const hashInput = context.userId + flag.key;
        const hash = crypto.createHash('md5').update(hashInput).digest('hex');
        const bucket = parseInt(hash.substring(0, 8), 16) % 100;

        if (bucket >= flag.conditions.percentage) return false;
    }

    return Object.entries(flag.conditions).every(([key, value]) => {
        if (key === 'percentage') return true; // already handled above
        return context[key] === value;
    });
};
