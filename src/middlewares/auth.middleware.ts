import jwt, { type JwtHeader, type SigningKeyCallback } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import type { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
dotenv.config();

export interface AuthRequest extends Request {
    user?: any;
}

const jwksUri = process.env.JWT_JWKS_URI;

if (!jwksUri) {
    throw new Error('JWT_JWKS_URI not found');
}

const client = jwksClient({
    jwksUri: jwksUri,
    cache: true,
    rateLimit: true,
});

const getKey = async (header: JwtHeader, callback: SigningKeyCallback) => {
    if (!header.kid) return callback(new Error('Kid not found in token'), undefined);

    client.getSigningKey(header.kid, (error, key) => {
        if (error || !key) {
            console.error('Could not get key from Keycloak', error);
            return callback(error, undefined);
        }

        const signinKey = key.getPublicKey();
        callback(null, signinKey);
    });
};

export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('No auth header or invalid format');
        return res.status(401).json({ error: 'Invalid token' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Token format error ' });

    jwt.verify(token, getKey, { algorithms: ['RS256'] }, (error, decoded: any) => {
        if (error) {
            console.log('JWT verify error:', error.message);
            return res.status(403).json({ error: 'Access denied: Invalid or expired token' });
        }

        const tenantId = decoded.tenantId;

        if (!tenantId) {
            console.log('No tenantId in token');
            return res.status(403).json({ error: 'Missed property of token' });
        }

        req.user = decoded;
        next();
    });
};
