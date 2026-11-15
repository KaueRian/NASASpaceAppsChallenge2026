import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CASES_PAGE_SIZE, CasesGrid } from "../src/components/CasesGrid.tsx";
import { PaginationControls } from "../src/components/PaginationControls.tsx";
import {
  DOSSIERS_PAGE_SIZE,
  RecentDossiersDrawer,
} from "../src/components/share/RecentDossiersDrawer.tsx";
import { validateCatalogFilterParams } from "../src/data/investigations.ts";
import { CASE_PRESETS } from "../src/data/presets/index.ts";
import { I18nProvider, type Locale } from "../src/i18n/i18n.tsx";
import {
  buildPaginationMetadata,
  buildVisiblePageNumbers,
  clampPage,
  getPaginationRange,
  paginateSlice,
  parsePositivePageParam,
} from "../src/lib/pagination.ts";
import type { SavedDossier } from "../src/types/investigation.ts";

function renderWithLocale(locale: Locale, node: ReactElement): string {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const store = new Map<string, string>([["etd.locale", locale]]);
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
    },
    configurable: true,
  });

  try {
    return renderToStaticMarkup(createElement(I18nProvider, null, node));
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, "localStorage", originalDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, "localStorage");
    }
  }
}

describe("Pagination helpers & UI controls ([23M])", () => {
  it("parses optional positive page params cleanly and rejects invalid values", () => {
    expect(parsePositivePageParam(undefined)).toEqual({ ok: true, page: undefined });
    expect(parsePositivePageParam("   ")).toEqual({ ok: true, page: undefined });
    expect(parsePositivePageParam("1")).toEqual({ ok: true, page: 1 });
    expect(parsePositivePageParam("12")).toEqual({ ok: true, page: 12 });

    expect(parsePositivePageParam("0").ok).toBe(false);
    expect(parsePositivePageParam("-2").ok).toBe(false);
    expect(parsePositivePageParam("1.5").ok).toBe(false);
    expect(parsePositivePageParam("abc").ok).toBe(false);
    expect(parsePositivePageParam("1001").ok).toBe(false);

    const badCatalogPage = validateCatalogFilterParams({ page: "0" });
    expect(badCatalogPage.ok).toBe(false);
    if (!badCatalogPage.ok) {
      expect(badCatalogPage.code).toBe("INVALID_FILTER");
    }
  });

  it("computes pagination metadata, slices, ranges, clamping, and ellipsis sequences", () => {
    const emptyMeta = buildPaginationMetadata(0, 1, 8);
    expect(emptyMeta).toEqual({
      page: 1,
      pageSize: 8,
      totalItems: 0,
      totalPages: 0,
      hasPrev: false,
      hasNext: false,
    });
    expect(getPaginationRange(emptyMeta)).toEqual({ start: 0, end: 0, total: 0 });
    expect(clampPage(4, emptyMeta.totalPages)).toBe(1);

    const items = Array.from({ length: 20 }, (_, i) => i + 1);
    const page1 = paginateSlice(items, 1, 8);
    expect(page1.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(page1.pagination).toEqual({
      page: 1,
      pageSize: 8,
      totalItems: 20,
      totalPages: 3,
      hasPrev: false,
      hasNext: true,
    });
    expect(getPaginationRange(page1.pagination)).toEqual({ start: 1, end: 8, total: 20 });

    const page3 = paginateSlice(items, 3, 8);
    expect(page3.items).toEqual([17, 18, 19, 20]);
    expect(page3.pagination).toEqual({
      page: 3,
      pageSize: 8,
      totalItems: 20,
      totalPages: 3,
      hasPrev: true,
      hasNext: false,
    });
    expect(getPaginationRange(page3.pagination)).toEqual({ start: 17, end: 20, total: 20 });

    const outOfRange = paginateSlice(items, 5, 8);
    expect(outOfRange.items).toEqual([]);
    expect(getPaginationRange(outOfRange.pagination)).toEqual({ start: 0, end: 0, total: 20 });

    expect(buildVisiblePageNumbers(1, 3)).toEqual([1, 2, 3]);
    expect(buildVisiblePageNumbers(5, 10)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 10]);
    expect(buildVisiblePageNumbers(1, 10)).toEqual([1, 2, 3, "ellipsis", 10]);
    expect(buildVisiblePageNumbers(10, 10)).toEqual([1, "ellipsis", 8, 9, 10]);
  });

  it("renders PaginationControls and CasesGrid at 8 items per page with PT/EN copy", () => {
    expect(CASES_PAGE_SIZE).toBe(8);

    const ptPage1 = renderWithLocale(
      "pt",
      createElement(CasesGrid, {
        activePresetId: "01",
        onSelectPreset: () => {},
        onSelectInvestigation: () => {},
      }),
    );
    expect(ptPage1).toContain("Mostrando 1–8 de 20");
    expect(ptPage1).toContain('aria-current="page"');
    expect(ptPage1).toContain('aria-label="Paginação de investigações"');
    expect(ptPage1).toContain("Anterior");
    expect(ptPage1).toContain("Próxima");
    expect(ptPage1).toContain("Vilhena, RO, Brasil");
    expect(ptPage1).toContain("Manaus, AM, Brasil");
    expect(ptPage1).not.toContain("Barreiras (MATOPIBA), BA, Brasil");
    expect(ptPage1).not.toContain("Sevilha, Espanha");

    const enPage2 = renderWithLocale(
      "en",
      createElement(CasesGrid, {
        activePresetId: "01",
        initialPage: 2,
        onSelectPreset: () => {},
        onSelectInvestigation: () => {},
      }),
    );
    expect(enPage2).toContain("Showing 9–16 of 20");
    expect(enPage2).toContain('aria-label="Investigations pagination"');
    expect(enPage2).toContain("Previous");
    expect(enPage2).toContain("Next");
    expect(enPage2).toContain("Barreiras (MATOPIBA), BA, Brazil");
    expect(enPage2).toContain("Porto Alegre, RS, Brazil");
    expect(enPage2).not.toContain("Seville, Spain");

    const ptPage3 = renderWithLocale(
      "pt",
      createElement(CasesGrid, {
        activePresetId: "01",
        initialPage: 3,
        onSelectPreset: () => {},
        onSelectInvestigation: () => {},
      }),
    );
    expect(ptPage3).toContain("Mostrando 17–20 de 20");
    expect(ptPage3).toContain("Svalbard, Ártico");
    expect(ptPage3).toContain("Sevilha, Espanha");

    const singlePageHtml = renderWithLocale(
      "en",
      createElement(PaginationControls, {
        pagination: buildPaginationMetadata(3, 1, 8),
        onPageChange: () => {},
        ariaLabel: "Single page test",
      }),
    );
    expect(singlePageHtml).toContain("Showing 1–3 of 3");
    expect(singlePageHtml).not.toContain("<nav");
  });

  it("renders RecentDossiersDrawer at 5 items per page with multi-page controls", () => {
    expect(DOSSIERS_PAGE_SIZE).toBe(5);

    const sampleDossiers: SavedDossier[] = Array.from({ length: 5 }, (_, idx) => ({
      id: `et-000000000${idx}`,
      createdAt: `2026-11-15T10:0${idx}:00.000Z`,
      result: {
        ...CASE_PRESETS[idx % CASE_PRESETS.length].result,
        location: {
          ...CASE_PRESETS[idx % CASE_PRESETS.length].result.location,
          label: `Sample City ${idx + 1}`,
        },
      },
    }));

    const ptDrawer = renderWithLocale(
      "pt",
      createElement(RecentDossiersDrawer, {
        defaultOpen: true,
        initialDossiers: sampleDossiers,
        initialPagination: buildPaginationMetadata(12, 1, DOSSIERS_PAGE_SIZE),
      }),
    );
    expect(ptDrawer).toContain("Sample City 1");
    expect(ptDrawer).toContain("Sample City 5");
    expect(ptDrawer).toContain("Mostrando 1–5 de 12");
    expect(ptDrawer).toContain('aria-label="Paginação de dossiês recentes"');
    expect(ptDrawer).toContain("Anterior");
    expect(ptDrawer).toContain("Próxima");
  });
});
