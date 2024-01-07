import { describe, it, expect } from "vitest";
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

function validate(schema: z.ZodSchema, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      error: "Validation failed",
      details: result.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    };
  }
  return { data: result.data };
}

describe("registerSchema", () => {
  it("validates correct input", () => {
    const result = validate(registerSchema, {
      email: "user@example.com",
      password: "SecurePass1",
      name: "John Doe",
    });
    expect(result.data).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it("rejects invalid email", () => {
    const result = validate(registerSchema, {
      email: "not-email",
      password: "SecurePass1",
      name: "John",
    });
    expect(result.error).toBe("Validation failed");
  });

  it("rejects weak password (no uppercase)", () => {
    const result = validate(registerSchema, {
      email: "user@example.com",
      password: "weakpass1",
      name: "John",
    });
    expect(result.error).toBe("Validation failed");
  });

  it("rejects weak password (no number)", () => {
    const result = validate(registerSchema, {
      email: "user@example.com",
      password: "WeakPassword",
      name: "John",
    });
    expect(result.error).toBe("Validation failed");
  });

  it("rejects short name", () => {
    const result = validate(registerSchema, {
      email: "user@example.com",
      password: "SecurePass1",
      name: "J",
    });
    expect(result.error).toBe("Validation failed");
  });
});

describe("loginSchema", () => {
  it("validates correct login", () => {
    const result = validate(loginSchema, { email: "user@example.com", password: "pass" });
    expect(result.data).toBeDefined();
  });

  it("rejects empty password", () => {
    const result = validate(loginSchema, { email: "user@example.com", password: "" });
    expect(result.error).toBe("Validation failed");
  });
});

describe("validate middleware function", () => {
  it("returns structured error details", () => {
    const result = validate(registerSchema, { email: "bad", password: "x", name: "" });
    expect(result.error).toBe("Validation failed");
    expect(result.details).toBeDefined();
    expect(result.details!.length).toBeGreaterThan(0);
    expect(result.details![0]).toHaveProperty("field");
    expect(result.details![0]).toHaveProperty("message");
  });
});
