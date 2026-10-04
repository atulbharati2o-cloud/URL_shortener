import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

export interface AccessTokenPayload {
    userId: string;
}

export function generateAccessToken(userId: bigint): string {
    return jwt.sign(
        {
            userId: userId.toString(),
        },
        env.jwtSecret,
        {
            expiresIn: env.jwtExpiresInSeconds,
        },
    );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
    const payload = jwt.verify(token, env.jwtSecret);

    if (
        typeof payload !== "object" ||
        payload === null ||
        typeof payload.userId !== "string"
    ) {
        throw new Error("Invalid access token payload");
    }

    return {
        userId: payload.userId,
    };
}