import type { NextFunction, Request, Response } from "express";
import { redis } from "../config/redis.js";
import type { AuthenticatedRequest } from "./auth.middleware.js";

// Allow 10 requests/min per user for URL creation. This is a simple rate limit to prevent abuse of the URL shortening service.
const URL_CREATE_LIMIT = 10;
const URL_CREATE_WINDOW_SECONDS = 60;

export async function urlCreateRateLimit(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const authenticatedRequest = req as AuthenticatedRequest;

    if (!redis.isReady) {
        console.warn("Redis unavailable. Skipping rate limit.");
        return next();
    }

    const key = `rate_limit:url_create:user:${authenticatedRequest.userId}`;

    try {
        const count = await redis.incr(key);

        if (count === 1) {
            await redis.expire(key, URL_CREATE_WINDOW_SECONDS);
        }

        if (count > URL_CREATE_LIMIT) {
            const ttl = await redis.ttl(key);

            return res.status(429).json({
                error: "Too many URL creation requests",
                retryAfterSeconds: ttl,
            });
        }

        

        next();
    } catch (error) {
        console.error("Rate limiter failed:", error);

        // Fail open:
        // Redis failure should not take down URL creation.
        next();
    }
}