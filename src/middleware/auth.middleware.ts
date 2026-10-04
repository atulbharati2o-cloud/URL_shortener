import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../modules/auth/jwt.js";

export interface AuthenticatedRequest extends Request {
    userId: bigint;
}

export function authenticate(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const authorization = req.headers.authorization;

    if (!authorization) {
        return res.status(401).json({
            error: "Authentication required",
        });
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
        return res.status(401).json({
            error: "Invalid authorization header",
        });
    }

    try {
        const payload = verifyAccessToken(token);

        const authenticatedRequest = req as AuthenticatedRequest;

        authenticatedRequest.userId = BigInt(payload.userId);

        next();
    } catch {
        return res.status(401).json({
            error: "Invalid or expired access token",
        });
    }
}