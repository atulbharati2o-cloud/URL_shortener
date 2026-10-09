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

    try {
        const analytics = await getUrlAnalytics(id);

        return res.status(200).json({
            success: true,
            data: analytics,
        });
    } catch (error) {
        console.error("Get analytics error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}