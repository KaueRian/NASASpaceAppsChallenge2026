import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";

export const app = new Hono().basePath("/api");

app.get("/health", (c) => {
  return c.json({
    ok: true,
    service: "earthtrend-detective",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  });
});

export const onRequest = handle(app);
