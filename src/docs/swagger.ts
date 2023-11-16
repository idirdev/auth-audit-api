import { Express } from "express";
import swaggerUi from "swagger-ui-express";

const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "Auth Audit API",
    version: "1.0.0",
    description: "Production-grade authentication and audit logging REST API",
  },
  servers: [{ url: "/api/v1", description: "API v1" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
          role: { type: "string", enum: ["superadmin", "admin", "editor", "viewer"] },
          active: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      AuditLog: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          action: { type: "string" },
          resource: { type: "string" },
          statusCode: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: { content: { "application/json": { schema: { type: "object", required: ["email", "password", "name"], properties: { email: { type: "string" }, password: { type: "string" }, name: { type: "string" } } } } } },
        responses: { "201": { description: "User created" }, "409": { description: "Email exists" } },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        requestBody: { content: { "application/json": { schema: { type: "object", required: ["email", "password"], properties: { email: { type: "string" }, password: { type: "string" } } } } } },
        responses: { "200": { description: "JWT tokens returned" }, "401": { description: "Invalid credentials" } },
      },
    },
    "/users": {
      get: {
        tags: ["Users"],
        summary: "List users (admin only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Paginated user list" } },
      },
    },
    "/audit": {
      get: {
        tags: ["Audit"],
        summary: "List audit logs (admin only)",
        security: [{ bearerAuth: [] }],
        responses: { "200": { description: "Paginated audit logs" } },
      },
    },
    "/health": {
      get: {
        tags: ["System"],
        summary: "Health check",
        responses: { "200": { description: "System health status" } },
      },
    },
  },
};

export function setupSwagger(app: Express) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}
