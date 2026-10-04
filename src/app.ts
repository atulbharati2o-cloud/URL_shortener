import express from "express";
import authRoutes from "./modules/auth/auth.routes.js";

const app = express();

app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/health", (_req, res) => {
    res.status(200).json({
        success: true,
        message: "URL Shortener API is healthy",
    });
});

export default app;