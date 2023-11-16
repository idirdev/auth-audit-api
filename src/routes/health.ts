import { Router } from "express";
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

export const healthRouter = Router();

healthRouter.get("/", async (req, res) => {
  const startTime = Date.now();

  try {
    await db.execute(sql`SELECT 1`);
    const dbLatency = Date.now() - startTime;

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "1.0.0",
      checks: {
        database: { status: "up", latencyMs: dbLatency },
        memory: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        },
      },
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      checks: { database: { status: "down", error: "Connection failed" } },
    });
  }
});

healthRouter.get("/ready", async (req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ ready: true });
  } catch {
    res.status(503).json({ ready: false });
  }
});
