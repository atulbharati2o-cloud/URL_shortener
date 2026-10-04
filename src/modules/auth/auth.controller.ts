import type { Request, Response } from "express";
import { getCurrentUser } from "./auth.service.js";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";
import {
    registerSchema,
    loginSchema,
} from "./auth.schema.js";
import {
    registerUser,
    loginUser,
} from "./auth.service.js";


export async function meController(
  req: Request,
  res: Response,
) {
  try {
    const authenticatedRequest = req as AuthenticatedRequest;

    const user = await getCurrentUser(
      authenticatedRequest.userId,
    );

    return res.status(200).json({
      user,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "User not found"
    ) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    console.error("Get current user error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}


export async function registerController(
    req: Request,
    res: Response,
) {
    const result = registerSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            error: "Invalid request body",
            details: result.error.flatten(),
        });
    }

    try {
        const data = await registerUser(result.data);

        return res.status(201).json(data);
    } catch (error) {
        if (
            error instanceof Error &&
            error.message === "Email already registered"
        ) {
            return res.status(409).json({
                error: error.message,
            });
        }

        console.error("Registration error:", error);

        return res.status(500).json({
            error: "Internal server error",
        });
    }
}

export async function loginController(
    req: Request,
    res: Response,
) {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            error: "Invalid request body",
            details: result.error.flatten(),
        });
    }

    try {
        const data = await loginUser(result.data);

        return res.status(200).json(data);
    } catch (error) {
        if (
            error instanceof Error &&
            error.message === "Invalid email or password"
        ) {
            return res.status(401).json({
                error: "Invalid email or password",
            });
        }

        console.error("Login error:", error);

        return res.status(500).json({
            error: "Internal server error",
        });
    }
}