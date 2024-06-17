import { Router } from "express";
import { db } from "../db/index.js";
import { auditLogs } from "../db/schema.js";
import { desc, sql, eq, and } from "drizzle-orm";
import { authenticate, authorize, AuthRequest } from "../middleware/auth.js";

export const auditRouter = Router();

auditRouter.use(authenticate);
auditRouter.use(authorize("superadmin", "admin"));

auditRouter.get("/", async (req: AuthRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const action = req.query.action as string | undefined;
  const resource = req.query.resource as string | undefined;

  const conditions = [];
  if (action) conditions.push(eq(auditLogs.action, action));
  if (resource) conditions.push(eq(auditLogs.resource, resource));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const results = await db.select().from(auditLogs).where(whereClause).orderBy(desc(auditLogs.createdAt)).limit(limit).offset((page - 1) * limit);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(whereClause);

  res.json({
    data: results,
    pagination: { page, limit, total: Number(count), pages: Math.ceil(Number(count) / limit) },
  });
});

auditRouter.get("/stats", async (req: AuthRequest, res) => {
  const [totalLogs] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs);
  const [last24h] = await db.select({ count: sql<number>`count(*)` }).from(auditLogs)
    .where(sql`${auditLogs.createdAt} > now() - interval '24 hours'`);

  res.json({
    total: Number(totalLogs.count),
    last24h: Number(last24h.count),
  });
});
