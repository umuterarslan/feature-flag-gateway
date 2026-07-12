import type { Request, Response, NextFunction } from 'express';
import { treeifyError, z } from 'zod';
import { Prisma } from '@prisma/client';

export const errorHandler = async (error: any, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof z.ZodError) {
        const formattedErrors = z.treeifyError(error);
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: formattedErrors,
        });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return res.status(404).json({
            success: false,
            message: 'Feature flag not found',
        });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return res.status(409).json({
            success: false,
            message: 'A record with this key already exists.',
        });
    }

    console.error(error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
};
