import { Router } from "express";
import crypto from "crypto";
import { db } from "../db/index.js";
import { webhooks } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { authenticate, authorize, AuthRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { z } from "zod";

const webhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
});

export const webhooksRouter = Router();

webhooksRouter.use(authenticate);
webhooksRouter.use(authorize("superadmin", "admin"));

webhooksRouter.get("/", async (req, res) => {
  const results = await db.select({
    id: webhooks.id, url: webhooks.url, events: webhooks.events,
    active: webhooks.active, failureCount: webhooks.failureCount,
    lastTriggeredAt: webhooks.lastTriggeredAt, createdAt: webhooks.createdAt,
  }).from(webhooks);
  res.json({ data: results });
});

webhooksRouter.post("/", validate(webhookSchema), async (req, res) => {
  const secret = crypto.randomBytes(32).toString("hex");
  const [webhook] = await db.insert(webhooks).values({ ...req.body, secret }).returning();
  res.status(201).json(webhook);
});

webhooksRouter.delete("/:id", async (req, res) => {
  const [deleted] = await db.delete(webhooks).where(eq(webhooks.id, req.params.id)).returning();
  if (!deleted) return res.status(404).json({ error: "Webhook not found" });
  res.json({ message: "Webhook deleted" });
});

webhooksRouter.post("/:id/test", async (req, res) => {
  const [webhook] = await db.select().from(webhooks).where(eq(webhooks.id, req.params.id)).limit(1);
  if (!webhook) return res.status(404).json({ error: "Webhook not found" });

  const payload = JSON.stringify({ event: "test", timestamp: new Date().toISOString() });
  const signature = crypto.createHmac("sha256", webhook.secret).update(payload).digest("hex");

  res.json({ message: "Test webhook sent", signature: `sha256=${signature}` });
});
