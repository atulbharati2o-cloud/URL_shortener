import type { Request, Response } from "express";

import {
    getUrlAnalytics,
} from "./analytics.service.js";

export async function getAnalytics(
    req: Request,
    res: Response,
) {
    const { id } = req.params;

    if (typeof id !== "string") {
        return res.status(400).json({
            success: false,
            message: "Invalid URL id",
        });
    }

    const analytics =
        await getUrlAnalytics(id);

    res.status(200).json({
        success: true,
        data: analytics,
    });
}