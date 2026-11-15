import type { Context } from "hono";
import {
  filterInvestigationCatalog,
  toInvestigateQuery,
  validateCatalogFilterParams,
} from "../../data/investigations.ts";
import { paginateSlice } from "../../lib/pagination.ts";
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
    page: c.req.query("page"),
  });

  if (!validation.ok) {
    const payload: ApiErrorResponse = {
      ok: false,
      code: validation.code,
      message: validation.message,
    };
    return c.json(payload, 400);
  }

  const { page, limit, ...matchingFilters } = validation.data;
  const allMatches = filterInvestigationCatalog(matchingFilters);
  const effectivePage = page ?? 1;
  const effectivePageSize = limit ?? (page !== undefined ? 8 : Math.max(8, allMatches.length));
  const { items: pageMatches, pagination } = paginateSlice(
    allMatches,
    effectivePage,
    effectivePageSize,
  );
  const investigations = pageMatches.map((item) => {
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
      total: pagination.totalItems,
      pagination,
      filters: validation.data,
      investigations,
    },
    200,
  );
}
