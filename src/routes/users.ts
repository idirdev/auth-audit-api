import { Router } from "express";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq, desc, sql } from "drizzle-orm";
import { authenticate, authorize, AuthRequest } from "../middleware/auth.js";

export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get("/", authorize("superadmin", "admin"), async (req: AuthRequest, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

  let query = db.select({
    id: users.id, email: users.email, name: users.name, role: users.role,
    active: users.active, loginCount: users.loginCount,
    lastLoginAt: users.lastLoginAt, createdAt: users.createdAt,
  }).from(users).$dynamic();

  const results = await query.orderBy(desc(users.createdAt)).limit(limit).offset((page - 1) * limit);
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users);

  res.json({
    data: results,
    pagination: { page, limit, total: Number(count), pages: Math.ceil(Number(count) / limit) },
  });
});

usersRouter.get("/me", async (req: AuthRequest, res) => {
  const [user] = await db.select({
    id: users.id, email: users.email, name: users.name, role: users.role,
    active: users.active, createdAt: users.createdAt,
  }).from(users).where(eq(users.id, req.user!.id)).limit(1);

  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

usersRouter.patch("/:id/role", authorize("superadmin"), async (req: AuthRequest, res) => {
  const { role } = req.body;
  if (!["superadmin", "admin", "editor", "viewer"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const [updated] = await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, req.params.id)).returning();
  if (!updated) return res.status(404).json({ error: "User not found" });
  res.json(updated);
});

usersRouter.patch("/:id/deactivate", authorize("superadmin", "admin"), async (req: AuthRequest, res) => {
  const [updated] = await db.update(users).set({ active: false, updatedAt: new Date() }).where(eq(users.id, req.params.id)).returning();
  if (!updated) return res.status(404).json({ error: "User not found" });
  res.json({ message: "User deactivated" });
});
