import * as grpc from '@grpc/grpc-js';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import prisma from '../config/db.js';
import dotenv from 'dotenv';
dotenv.config();

const jwksUri = process.env.JWT_JWKS_URI;

if (!jwksUri) {
    throw new Error('JWT_JWKS_URI not found');
}

const jwks = jwksClient({
    jwksUri: jwksUri,
    cache: true,
});

const getKey = (header: any, callback: any) => {
    jwks.getSigningKey(header.kid, (error, key) => {
        callback(error, key?.getPublicKey());
    });
};

export type AuthenticatedCall = (
    | grpc.ServerUnaryCall<any, any>
    | grpc.ServerWritableStream<any, any>
) & { tenantId: string };

export async function authenticateGrpcCall<Req, Res>(
    call: grpc.ServerUnaryCall<Req, Res> | grpc.ServerWritableStream<Req, Res>
): Promise<string> {
    const authHeader = call.metadata.get('authorization')[0];
    const apiKey = call.metadata.get('x-api-key')[0];

    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1] as string;

        if (!token) throw { code: grpc.status.UNAUTHENTICATED, details: 'Invalid token' };

        return new Promise((resolve, reject) => {
            jwt.verify(token, getKey, { algorithms: ['RS256'] }, (error, decoded: any) => {
                if (error || !decoded.tenantId)
                    return reject({ code: grpc.status.UNAUTHENTICATED, details: 'Invalid token' });
                resolve(decoded.tenantId);
            });
        });
    }

    if (apiKey) {
        const keyRecord = await prisma.apiKey.findUnique({
            where: { key: apiKey.toString() },
            select: { id: true, tenantId: true },
        });

        if (!keyRecord) throw { code: grpc.status.UNAUTHENTICATED, details: 'Invalid API Key' };

        prisma.apiKey.update({ where: { id: keyRecord.id }, data: { lastUsed: new Date() } });

        return keyRecord.tenantId;
    }

    throw { code: grpc.status.UNAUTHENTICATED, details: 'No authentication provided' };
}

export function withAuth(handler: Function) {
    return async (call: any, callback?: any) => {
        try {
            const tenantId = await authenticateGrpcCall(call);

            const authCall = call as AuthenticatedCall;
            authCall.tenantId = tenantId;

            await handler(authCall, callback);
        } catch (error) {
            if (callback) {
                callback(error, null);
            } else {
                call.emit('error', error);
                call.end();
            }
        }
    };
}
