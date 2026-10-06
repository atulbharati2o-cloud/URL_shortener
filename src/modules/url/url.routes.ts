import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { urlCreateRateLimit } from "../../middleware/rate-limit.middleware.js";
import {
    createUrlController,
    updateUrlController,
    deleteUrlController,
} from "./url.controller.js";

const router = Router();

router.post(
    "/",
    authenticate,
    urlCreateRateLimit,
    createUrlController
);

router.patch(
    "/:shortCode",
    authenticate,
    updateUrlController,
);

router.delete(
    "/:shortCode",
    authenticate,
    deleteUrlController,
);

export default router;