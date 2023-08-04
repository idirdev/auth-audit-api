import { Request, Response, NextFunction } from "express";
import { logger } from "../services/logger.js";

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  logger.error(`${err.message}\n${err.stack}`);

  if (err.name === "ZodError") {
    return res.status(400).json({ error: "Validation error", details: err });
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token" });
  }

  res.status(500).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
}
