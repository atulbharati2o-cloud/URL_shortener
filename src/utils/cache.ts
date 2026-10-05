import { redis } from "../config/redis.js";

export async function invalidateUrlCache(shortCode: string) {
    if (!redis.isReady) {
        console.log("Redis unavailable. Skipping cache invalidation.");
        return;
    }

    const cacheKey = `url:${shortCode}`;

    try {
        await redis.del(cacheKey);
        console.log(`Redis DEL: ${cacheKey}`);
    } catch (error) {
        console.error("Redis DEL failed:", error);
    }
}