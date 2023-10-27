import { db } from "../db/index.js";
import { jobs } from "../db/schema.js";
import { eq, and, lte, sql } from "drizzle-orm";
import { logger } from "../services/logger.js";

type JobHandler = (payload: unknown) => Promise<unknown>;

const handlers = new Map<string, JobHandler>();

export function registerJob(type: string, handler: JobHandler) {
  handlers.set(type, handler);
}

export async function enqueueJob(type: string, payload: unknown, scheduledAt?: Date) {
  const [job] = await db.insert(jobs).values({ type, payload, scheduledAt }).returning();
  logger.info(`Job enqueued: ${type} (${job.id})`);
  return job;
}

export async function processJobs() {
  const pending = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.status, "pending"), lte(jobs.attempts, sql`${jobs.maxAttempts}`)))
    .limit(10);

  for (const job of pending) {
    const handler = handlers.get(job.type);
    if (!handler) {
      logger.warn(`No handler for job type: ${job.type}`);
      continue;
    }

    await db.update(jobs).set({ status: "running", startedAt: new Date(), attempts: (job.attempts || 0) + 1 }).where(eq(jobs.id, job.id));

    try {
      const result = await handler(job.payload);
      await db.update(jobs).set({ status: "completed", result, completedAt: new Date() }).where(eq(jobs.id, job.id));
      logger.info(`Job completed: ${job.type} (${job.id})`);
    } catch (error) {
      const err = error as Error;
      await db.update(jobs).set({
        status: (job.attempts || 0) + 1 >= (job.maxAttempts || 3) ? "failed" : "pending",
        result: { error: err.message },
      }).where(eq(jobs.id, job.id));
      logger.error(`Job failed: ${job.type} (${job.id}): ${err.message}`);
    }
  }
}

registerJob("send_email", async (payload: any) => {
  logger.info(`Sending email to: ${payload.to}`);
  return { sent: true };
});

registerJob("cleanup_sessions", async () => {
  logger.info("Cleaning up expired sessions");
  return { cleaned: true };
});
