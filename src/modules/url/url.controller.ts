import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middleware/auth.middleware.js";

import { createUrlSchema, updateUrlSchema } from "./url.schema.js";
import { createShortUrl, getOriginalUrl, updateShortUrl, deleteShortUrl } from "./url.service.js";

export async function createUrlController(
  req: Request,
  res: Response,
) {
  const result = createUrlSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: result.error.flatten(),
    });
  }

  try {
    const authenticatedRequest = req as AuthenticatedRequest;

    const url = await createShortUrl(
      authenticatedRequest.userId,
      result.data,
    );

    return res.status(201).json({
      url,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "No active ticket server available"
    ) {
      return res.status(503).json({
        error: "Short URL creation temporarily unavailable",
      });
    }

    console.error("Create URL error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}


export async function redirectController(
  req: Request,
  res: Response,
) {
  const { shortCode } = req.params;

  if (typeof shortCode !== "string" || shortCode.length === 0) {
    return res.status(400).json({
      error: "Short code is required",
    });
  }

  try {
    const originalUrl = await getOriginalUrl(shortCode);

    return res.redirect(301, originalUrl);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "URL not found"
    ) {
      return res.status(404).json({
        error: "Short URL not found",
      });
    }

    if (
      error instanceof Error &&
      error.message === "URL deleted"
    ) {
      return res.status(404).json({
        error: "Short URL not found",
      });
    }

    if (
      error instanceof Error &&
      error.message === "URL expired"
    ) {
      return res.status(410).json({
        error: "Short URL has expired",
      });
    }

    console.error("Redirect error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}


export async function updateUrlController(
  req: Request,
  res: Response,
) {
  const { shortCode } = req.params;

  if (typeof shortCode !== "string" || shortCode.length === 0) {
    return res.status(400).json({
      error: "Short code is required",
    });
  }

  const result = updateUrlSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: result.error.flatten(),
    });
  }

  try {
    const authenticatedRequest = req as AuthenticatedRequest;

    const url = await updateShortUrl(
      authenticatedRequest.userId,
      shortCode,
      result.data,
    );

    return res.status(200).json({
      url,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "URL not found") {
      return res.status(404).json({
        error: "Short URL not found",
      });
    }

    if (error instanceof Error && error.message === "Forbidden") {
      return res.status(403).json({
        error: "You do not have permission to modify this URL",
      });
    }

    if (error instanceof Error && error.message === "URL deleted") {
      return res.status(404).json({
        error: "Short URL not found",
      });
    }

    if (
      error instanceof Error &&
      error.message === "URL expired"
    ) {
      return res.status(410).json({
        error: "Short URL has expired",
      });
    }

    console.error("Update URL error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}



export async function deleteUrlController(
  req: Request,
  res: Response,
) {
  const { shortCode } = req.params;

  if (typeof shortCode !== "string" || shortCode.length === 0) {
    return res.status(400).json({
      error: "Short code is required",
    });
  }

  try {
    const authenticatedRequest = req as AuthenticatedRequest;

    const url = await deleteShortUrl(
      authenticatedRequest.userId,
      shortCode,
    );

    return res.status(200).json({
      message: "Short URL deleted successfully",
      url,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "URL not found") {
      return res.status(404).json({
        error: "Short URL not found",
      });
    }

    if (error instanceof Error && error.message === "Forbidden") {
      return res.status(403).json({
        error: "You do not have permission to delete this URL",
      });
    }

    if (
      error instanceof Error &&
      error.message === "URL already deleted"
    ) {
      return res.status(404).json({
        error: "Short URL not found",
      });
    }

    if (
      error instanceof Error &&
      error.message === "URL expired"
    ) {
      return res.status(410).json({
        error: "Short URL has expired",
      });
    }

    console.error("Delete URL error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}