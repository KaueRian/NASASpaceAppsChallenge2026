import type { D1Database } from "@cloudflare/workers-types";
import { Hono } from "hono";
import { handleAiInterpret, handleAiTranslate } from "./routes/ai.ts";
import { handleCreateDossier, handleGetDossier, handleListDossiers } from "./routes/dossiers.ts";
import { handleGeocode } from "./routes/geocode.ts";
import { handleInvestigate } from "./routes/investigate.ts";
import { handleListInvestigations } from "./routes/investigations.ts";

export interface WorkerBindings {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  DB?: D1Database;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
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

app.post("/api/ai/translate", handleAiTranslate);
app.post("/api/ai/interpret", handleAiInterpret);
app.get("/api/investigate", handleInvestigate);
app.get("/api/investigations", handleListInvestigations);
app.get("/api/geocode", handleGeocode);
app.get("/api/dossiers", handleListDossiers);
app.post("/api/dossiers", handleCreateDossier);
app.get("/api/dossiers/:id", handleGetDossier);

app.all("/api/*", (c) => {
  return c.json({ ok: false, message: "API endpoint not found" }, 404);
});

app.all("*", (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

export default app;
