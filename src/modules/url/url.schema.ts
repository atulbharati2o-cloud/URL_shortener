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


export const updateUrlSchema = z
    .object({
        originalUrl: z
            .string()
            .url()
            .max(2048)
            .optional(),

        expiresAt: z
            .coerce
            .date()
            .nullable()
            .optional(),
    })
    .refine(
        (data) =>
            data.originalUrl !== undefined ||
            data.expiresAt !== undefined,
        {
            message: "At least one field must be provided",
        },
    );

export type UpdateUrlInput = z.infer<typeof updateUrlSchema>;