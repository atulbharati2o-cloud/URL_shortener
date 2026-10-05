import { prisma } from "../../db/prisma.js";
import { encode, decode } from "../../utils/encoder.js";
import type { CreateUrlInput } from "./url.schema.js";
import { allocateTicket } from "../ticket/ticket.service.js";
import { redis } from "../../config/redis.js";

const URL_CACHE_TTL_SECONDS = 60 * 60; // 1 hour

export async function createShortUrl(
    userId: bigint,
    input: CreateUrlInput,
) {
    for (let attempt = 0; attempt < 3; attempt++) {
        const ticket = await allocateTicket();
        const shortCode = encode(ticket);

        try {
            const url = await prisma.url.create({
                data: {
                    id: ticket,
                    shortCode,
                    originalUrl: input.originalUrl,
                    userId,
                    ...(input.expiresAt !== undefined && {
                        expiresAt: input.expiresAt,
                    }),
                },
            });

            return {
                id: url.id.toString(),
                shortCode: url.shortCode,
                originalUrl: url.originalUrl,
                expiresAt: url.expiresAt,
                createdAt: url.createdAt,
            };
        } catch (error) {
            if (
                !(
                    error instanceof Error &&
                    "code" in error &&
                    error.code === "P2002"
                )
            ) {
                throw error;
            }
        }
    }

    throw new Error("Unable to allocate a unique short URL");
}


export async function getOriginalUrl(shortCode: string) {

    const cacheKey = `url:${shortCode}`;

    // Check redis only if it is currently connected and ready
    if(redis.isReady){
        // Check Redis cache first
        try{
            const cachedUrl = await redis.get(cacheKey);
            if (cachedUrl !== null) {
                console.log(`Redis HIT: ${cacheKey}`);
                return cachedUrl;
            }
    
            console.log(`Redis MISS: ${cacheKey}`);
        } catch (error) {
            console.error(`Redis GET failed:`, error);
        }
    } else {
        console.log(`Redis unavailable. Using MySQL.`)
    }

    const id = decode(shortCode);

    const url = await prisma.url.findUnique({
        where: {
            id,
        },
    });

    if (!url) {
        throw new Error("URL not found");
    }

    if (url.deletedAt !== null) {
        throw new Error("URL deleted");
    }

    if (url.expiresAt !== null && url.expiresAt <= new Date()) {
        throw new Error("URL expired");
    }

    // check is redis is ready before trying to set the cache
    if (redis.isReady) {
        // Cache the original URL in Redis
        try {
            await redis.set(cacheKey, url.originalUrl, {
                EX: URL_CACHE_TTL_SECONDS,
            });
    
            console.log(`Redis SET: ${cacheKey} (TTL: ${URL_CACHE_TTL_SECONDS}s)`);
        } catch (error) {
            console.error(`Redis SET failed:`, error);
        }
    }


    return url.originalUrl;
}
