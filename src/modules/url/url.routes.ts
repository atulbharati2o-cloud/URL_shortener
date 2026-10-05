import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { createUrlController } from "./url.controller.js";

const router = Router();

router.post("/", authenticate, createUrlController);

export default router;