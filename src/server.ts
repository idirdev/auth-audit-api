import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { auditRouter } from "./routes/audit.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { healthRouter } from "./routes/health.js";
import { errorHandler } from "./middleware/error.js";
import { rateLimiter } from "./middleware/rate-limit.js";
import { auditMiddleware } from "./middleware/audit.js";
import { setupSwagger } from "./docs/swagger.js";
import { logger } from "./services/logger.js";

const app = express();
const PORT = parseInt(process.env.PORT || "4000");

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(rateLimiter);
app.use(auditMiddleware);

setupSwagger(app);

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/audit", auditRouter);
app.use("/api/v1/webhooks", webhooksRouter);
app.use("/api/v1/health", healthRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`API docs: http://localhost:${PORT}/api-docs`);
});

export default app;
