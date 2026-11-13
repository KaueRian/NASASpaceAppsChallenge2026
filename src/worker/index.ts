import { Hono } from "hono";

export interface WorkerBindings {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export const app = new Hono<{ Bindings: WorkerBindings }>();

app.get("/api/health", (c) => {
  return c.json({
    ok: true,
    service: "earthtrend-detective",
    runtime: "cloudflare-workers",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  });
});

app.all("/api/*", (c) => {
  return c.json({ ok: false, message: "API endpoint not found" }, 404);
});

app.all("*", (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
