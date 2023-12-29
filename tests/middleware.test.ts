import { describe, it, expect, vi } from "vitest";
import jwt from "jsonwebtoken";

// Test authenticate logic
describe("authenticate", () => {
  const JWT_SECRET = "test-secret";

  function verifyToken(authHeader: string | undefined) {
    if (!authHeader?.startsWith("Bearer ")) {
      return { error: "Missing or invalid authorization header", status: 401 };
    }
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      return { user: { id: payload.sub, email: payload.email, role: payload.role } };
    } catch {
      return { error: "Invalid or expired token", status: 401 };
    }
  }

  it("rejects missing authorization header", () => {
    const result = verifyToken(undefined);
    expect(result.error).toBe("Missing or invalid authorization header");
  });

  it("rejects non-Bearer header", () => {
    const result = verifyToken("Basic abc123");
    expect(result.error).toBe("Missing or invalid authorization header");
  });

  it("rejects invalid token", () => {
    const result = verifyToken("Bearer invalid.token.here");
    expect(result.error).toBe("Invalid or expired token");
  });

  it("extracts user from valid token", () => {
    const token = jwt.sign({ sub: "user-1", email: "test@example.com", role: "admin" }, JWT_SECRET);
    const result = verifyToken(`Bearer ${token}`);
    expect(result.user).toEqual({ id: "user-1", email: "test@example.com", role: "admin" });
  });

  it("rejects expired token", () => {
    const token = jwt.sign({ sub: "user-1", email: "test@example.com", role: "admin" }, JWT_SECRET, { expiresIn: "-1s" });
    const result = verifyToken(`Bearer ${token}`);
    expect(result.error).toBe("Invalid or expired token");
  });
});

// Test authorize logic
describe("authorize", () => {
  function checkRole(userRole: string | undefined, allowedRoles: string[]) {
    if (!userRole) return { error: "Not authenticated", status: 401 };
    if (!allowedRoles.includes(userRole)) return { error: "Insufficient permissions", status: 403 };
    return { ok: true };
  }

  it("allows matching role", () => {
    expect(checkRole("admin", ["admin", "superadmin"])).toEqual({ ok: true });
  });

  it("rejects non-matching role", () => {
    const result = checkRole("viewer", ["admin", "superadmin"]);
    expect(result.error).toBe("Insufficient permissions");
  });

  it("rejects undefined user", () => {
    const result = checkRole(undefined, ["admin"]);
    expect(result.error).toBe("Not authenticated");
  });
});
