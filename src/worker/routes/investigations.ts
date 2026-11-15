import type { Context } from "hono";
import {
  filterInvestigationCatalog,
  toInvestigateQuery,
  validateCatalogFilterParams,
} from "../../data/investigations.ts";
import { buildInvestigateApiPath, buildInvestigatePath } from "../../lib/routing.ts";
import type { ApiErrorResponse } from "../../types/investigation.ts";
import type { WorkerBindings } from "../index.ts";

export function handleListInvestigations(c: Context<{ Bindings: WorkerBindings }>) {
  const validation = validateCatalogFilterParams({
    scale: c.req.query("scale"),
    topic: c.req.query("topic"),
    variable: c.req.query("variable"),
    season: c.req.query("season"),
    q: c.req.query("q"),
    presetOnly: c.req.query("presetOnly"),
    limit: c.req.query("limit"),
  });

  if (!validation.ok) {
    const payload: ApiErrorResponse = {
      ok: false,
      code: validation.code,
      message: validation.message,
    };
    return c.json(payload, 400);
  }

  const matches = filterInvestigationCatalog(validation.data);
  const investigations = matches.map((item) => {
    const query = toInvestigateQuery(item);
    return {
      id: item.id,
      ...(item.presetId ? { presetId: item.presetId } : {}),
      scale: item.scale,
      topic: item.topic,
      location: {
        label: item.label,
        lat: item.lat,
        lon: item.lon,
      },
      tags: item.tags,
      query,
      investigateApiPath: buildInvestigateApiPath(query),
      investigateAppPath: buildInvestigatePath(query),
    };
  });

  return c.json(
    {
      ok: true,
      total: investigations.length,
      filters: validation.data,
      investigations,
    },
    200,
  );
}
