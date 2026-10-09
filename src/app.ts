import express from "express";
import authRoutes from "./modules/auth/auth.routes.js";
import urlRoutes from "./modules/url/url.routes.js";
import { redirectController } from "./modules/url/url.controller.js";
import analyticsRoutes from "./modules/analytics/analytics.route.js";

const app = express();

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/urls", urlRoutes);

app.use("/api/analytics", analyticsRoutes);

app.get("/health", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "URL Shortener API is healthy",
    });
});

app.get("/:shortCode", redirectController);

export default app;