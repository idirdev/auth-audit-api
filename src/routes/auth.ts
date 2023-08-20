import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import { users, sessions, passwordResets } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { validate } from "../middleware/validate.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rate-limit.js";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  name: z.string().min(2).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post("/register", authLimiter, validate(registerSchema), async (req, res) => {
  const { email, password, name } = req.body;

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return res.status(409).json({ error: "Email already registered" });

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(users).values({ email, passwordHash, name }).returning({ id: users.id, email: users.email, role: users.role });

  res.status(201).json({ user });
});

authRouter.post("/login", authLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !user.active) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "15m" }
  );

  const refreshToken = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    userId: user.id, refreshToken, expiresAt,
    ipAddress: req.ip, userAgent: req.headers["user-agent"],
  });

  await db.update(users).set({ lastLoginAt: new Date(), loginCount: (user.loginCount || 0) + 1 }).where(eq(users.id, user.id));

  res.json({ accessToken, refreshToken, expiresIn: 900 });
});

authRouter.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "Refresh token required" });

  const [session] = await db.select().from(sessions).where(eq(sessions.refreshToken, refreshToken)).limit(1);
  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user) return res.status(401).json({ error: "User not found" });

  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, session.id));

  const accessToken = jwt.sign({ sub: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET!, { expiresIn: "15m" });
  const newRefreshToken = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({ userId: user.id, refreshToken: newRefreshToken, expiresAt, ipAddress: req.ip });

  res.json({ accessToken, refreshToken: newRefreshToken, expiresIn: 900 });
});

authRouter.post("/logout", authenticate, async (req: AuthRequest, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.refreshToken, refreshToken));
  }
  res.json({ message: "Logged out" });
});

authRouter.post("/forgot-password", authLimiter, async (req, res) => {
  const { email } = req.body;
  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);

  if (user) {
    const token = uuidv4();
    await db.insert(passwordResets).values({ userId: user.id, token, expiresAt: new Date(Date.now() + 3600000) });
  }

  res.json({ message: "If that email exists, a reset link has been sent" });
});
