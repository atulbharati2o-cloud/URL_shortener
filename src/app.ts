import express from "express";
import authRoutes from "./modules/auth/auth.routes.js";
import urlRoutes from "./modules/url/url.routes.js";
import { redirectController } from "./modules/url/url.controller.js";

const app = express();

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/urls", urlRoutes);

app.get("/:shortCode", redirectController);

app.get("/health", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "URL Shortener API is healthy",
    });
});

export default app;