import { buildServer } from "./app.js";
import { createFileDemoStore } from "./data.js";

function positiveIntegerEnv(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "127.0.0.1";
const bodyLimit = positiveIntegerEnv("BODY_LIMIT_BYTES", 32 * 1024);
const rateLimitMax = positiveIntegerEnv("RATE_LIMIT_MAX", 60);
const rateLimitWindowMs = positiveIntegerEnv("RATE_LIMIT_WINDOW_MS", 60_000);
const store = process.env.VOTE_STORE_PATH ? await createFileDemoStore(process.env.VOTE_STORE_PATH) : undefined;
const server = await buildServer({
  bodyLimit,
  rateLimit: {
    max: rateLimitMax,
    timeWindow: rateLimitWindowMs
  },
  store
});

await server.listen({ host, port });
