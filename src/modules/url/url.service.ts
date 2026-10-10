import { prisma } from "../../db/prisma.js";
import { encode, decode } from "../../utils/encoder.js";
import { invalidateUrlCache } from "../../utils/cache.js";
import type { CreateUrlInput, UpdateUrlInput } from "./url.schema.js";
import { allocateTicket } from "../ticket/ticket.service.js";
import { redis } from "../../config/redis.js";
import { createHash } from "node:crypto";
import { getShardById } from "../../db/shard-router.js";

const URL_CACHE_TTL_SECONDS = 60 * 60; // 1 hour

function createRequestHash(input: CreateUrlInput): string {
    return createHash("sha256")
        .update(
            JSON.stringify({
                originalUrl: input.originalUrl,
                expiresAt: input.expiresAt?.toISOString() ?? null,
            }),
        )
        .digest("hex");
}

export async function createShortUrl(
    userId: bigint,
    input: CreateUrlInput,
    idempotencyKey?: string,
) {
    if (idempotencyKey !== undefined) {
        const existing = await prisma.idempotencyKey.findUnique({
            where: {
                userId_key: {
                    userId,
                    key: idempotencyKey,
                },
            },
        });

        if (existing) {
            const requestHash = createRequestHash(input);

            if (existing.requestHash !== requestHash) {
                throw new Error("IDEMPOTENCY_KEY_CONFLICT");
            }

            if (existing.urlId === null) {
                throw new Error("IDEMPOTENCY_RESULT_MISSING");
            }

            const shard = getShardById(existing.urlId)
            const existingUrl = await shard.url.findUnique({
                where: {
                    id: existing.urlId,
                },
            });

            if (!existingUrl) {
                throw new Error("IDEMPOTENCY_RESULT_MISSING");
            }

            return {
                id: existingUrl.id.toString(),
                shortCode: existingUrl.shortCode,
                originalUrl: existingUrl.originalUrl,
                expiresAt: existingUrl.expiresAt,
                createdAt: existingUrl.createdAt,
            };
        }
    }

    for (let attempt = 0; attempt < 3; attempt++) {
        const ticket = await allocateTicket();
        const shortCode = encode(ticket);

        try {
            const shard = getShardById(ticket);

            const url = await shard.url.create({
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

            if (idempotencyKey !== undefined) {
                await prisma.idempotencyKey.create({
                    data: {
                        key: idempotencyKey,
                        userId,
                        requestHash: createRequestHash(input),
                        urlId: url.id,
                    },
                });
            }

            return {
                id: url.id.toString(),
                shortCode: url.shortCode,
                originalUrl: url.originalUrl,
                expiresAt: url.expiresAt,
                createdAt: url.createdAt,
            };
        } catch (error) {
            if (error instanceof Error && "code" in error && error.code === "P2002") {
                if (idempotencyKey !== undefined) {
                    const existing = await prisma.idempotencyKey.findUnique({
                        where: {
                            userId_key: {
                                userId,
                                key: idempotencyKey,
                            },
                        },
                    });

                    if (existing) {
                        if (existing.requestHash !== createRequestHash(input)) {
                            throw new Error("IDEMPOTENCY_KEY_CONFLICT");
                        }

                        if (existing.urlId === null) {
                            throw new Error("IDEMPOTENCY_RESULT_MISSING");
                        }

                        const shard = getShardById(existing.urlId)
                        const existingUrl = await shard.url.findUnique({
                            where: {
                                id: existing.urlId,
                            },
                        });

                        if (!existingUrl) {
                            throw new Error("IDEMPOTENCY_RESULT_MISSING");
                        }

                        return {
                            id: existingUrl.id.toString(),
                            shortCode: existingUrl.shortCode,
                            originalUrl: existingUrl.originalUrl,
                            expiresAt: existingUrl.expiresAt,
                            createdAt: existingUrl.createdAt,
                        };
                    }
                }

                // No matching idempotency record: retry a possible
                // shortCode uniqueness collision.
                continue;
            }

            throw error;
        }
    }

    throw new Error("Unable to allocate a unique short URL");
}

export async function getOriginalUrl(shortCode: string) {
    const cacheKey = `url:${shortCode}`;

    // Check redis only if it is currently connected and ready
    if (redis.isReady) {
        // Check Redis cache first
        try {
            const cachedUrl = await redis.get(cacheKey);
            if (cachedUrl !== null) {
                console.log(`Redis HIT: ${cacheKey}`);

                const cachedData = JSON.parse(cachedUrl) as {
                    originalUrl: string;
                    expiresAt: string | null;
                };

                // Check if the cached URL has expired
                if (
                    cachedData.expiresAt !== null &&
                    new Date(cachedData.expiresAt) <= new Date()
                ) {
                    console.log(`Cached URL expired: ${cacheKey}`);
                    await redis.del(cacheKey);

                    throw new Error("URL expired");
                }

                return cachedData.originalUrl;
            }

            console.log(`Redis MISS: ${cacheKey}`);
        } catch (error) {
            console.error(`Redis GET failed:`, error);
        }
    } else {
        console.log(`Redis unavailable. Using MySQL.`);
    }

    let id: bigint;
    try {
        id = decode(shortCode);
    } catch {
        throw new Error("URL not found");
    }

    const shard = getShardById(id);

    const url = await shard.url.findUnique({
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
            const cacheValue = JSON.stringify({
                originalUrl: url.originalUrl,
                expiresAt: url.expiresAt ? url.expiresAt.toISOString() : null,
            });
            await redis.set(cacheKey, cacheValue, {
                EX: URL_CACHE_TTL_SECONDS,
            });

            console.log(`Redis SET: ${cacheKey} (TTL: ${URL_CACHE_TTL_SECONDS}s)`);
        } catch (error) {
            console.error(`Redis SET failed:`, error);
        }
    }

    return url.originalUrl;
}

export async function updateShortUrl(
    userId: bigint,
    shortCode: string,
    input: UpdateUrlInput,
) {
    const shard = getShardById(decode(shortCode))
    const url = await shard.url.findUnique({
        where: {
            shortCode,
        },
    });

    if (!url) {
        throw new Error("URL not found");
    }

    if (url.userId !== userId) {
        throw new Error("Forbidden");
    }

    if (url.deletedAt !== null) {
        throw new Error("URL deleted");
    }

    if (url.expiresAt !== null && url.expiresAt <= new Date()) {
        throw new Error("URL expired");
    }

    const updatedUrl = await shard.url.update({
        where: {
            shortCode,
        },
        data: {
            ...(input.originalUrl !== undefined && {
                originalUrl: input.originalUrl,
            }),

            ...(input.expiresAt !== undefined && {
                expiresAt: input.expiresAt,
            }),
        },
    });

    // Invalidate stale Redis cache
    invalidateUrlCache(shortCode);

    return {
        id: updatedUrl.id.toString(),
        shortCode: updatedUrl.shortCode,
        originalUrl: updatedUrl.originalUrl,
        expiresAt: updatedUrl.expiresAt,
        deletedAt: updatedUrl.deletedAt,
        createdAt: updatedUrl.createdAt,
        updatedAt: updatedUrl.updatedAt,
    };
}

export async function deleteShortUrl(userId: bigint, shortCode: string) {
    const shard = getShardById(decode(shortCode))
    const url = await shard.url.findUnique({
        where: {
            shortCode,
        },
    });

    if (!url) {
        throw new Error("URL not found");
    }

    if (url.userId !== userId) {
        throw new Error("Forbidden");
    }

    if (url.deletedAt !== null) {
        throw new Error("URL already deleted");
    }

    if (url.expiresAt !== null && url.expiresAt <= new Date()) {
        throw new Error("URL expired");
    }

    const deletedUrl = await shard.url.update({
        where: {
            shortCode,
        },
        data: {
            deletedAt: new Date(),
        },
    });

    // Invalidate stale Redis cache
    invalidateUrlCache(shortCode);

    return {
        id: deletedUrl.id.toString(),
        shortCode: deletedUrl.shortCode,
        deletedAt: deletedUrl.deletedAt,
    };
}
