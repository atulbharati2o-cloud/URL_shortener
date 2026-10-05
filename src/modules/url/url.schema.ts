import { z } from "zod";

export const createUrlSchema = z.object({
    originalUrl: z
        .string()
        .url()
        .max(2048),

    expiresAt: z
        .coerce
        .date()
        .optional(),
});

export type CreateUrlInput = z.infer<typeof createUrlSchema>;