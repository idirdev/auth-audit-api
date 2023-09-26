import { Request, Response, NextFunction } from "express";
import { db } from "../db/index.js";
import { auditLogs } from "../db/schema.js";
import { AuthRequest } from "./auth.js";

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.path.includes("/health")) {
    return next();
  }

  const startTime = Date.now();
  const originalSend = res.send.bind(res);

  res.send = function (body: any) {
    const duration = Date.now() - startTime;
    const authReq = req as AuthRequest;

    db.insert(auditLogs)
      .values({
        userId: authReq.user?.id,
        action: `${req.method} ${req.path}`,
        resource: req.path.split("/")[3] || "unknown",
        resourceId: req.params.id,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
        statusCode: res.statusCode,
        durationMs: duration,
      })
      .catch(() => {});

    return originalSend(body);
  };

  next();
}
