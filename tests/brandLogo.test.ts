import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppHeader } from "../src/components/AppHeader";
import { BrandLogo, drawBrandMarkOnCanvas } from "../src/components/BrandLogo";
import { BirthdayCard } from "../src/components/share/BirthdayCard";
import { EvidenceCard } from "../src/components/share/EvidenceCard";
import { getCasePresetById } from "../src/data/presets";
import { I18nProvider } from "../src/i18n/i18n";
import type { BirthdayResult } from "../src/types/birthday";

const ROOT = resolve(__dirname, "..");

function hasPngSignature(filePath: string): boolean {
  const buf = readFileSync(filePath);
  return (
    buf.length > 64 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  );
}

describe("GeoTrend <BrandLogo /> and integrated visual kit ([20H])", () => {
  it("renders dark Editorial wordmark with orbital globe graticule and ascending terracotta trend", () => {
    const html = renderToStaticMarkup(createElement(BrandLogo));
    expect(html).toContain('viewBox="0 0 32 32"');
    expect(html).toContain("#EDEDEA");
    expect(html).toContain("#9B9B98");
    expect(html).toContain("#C1472E");
    expect(html).toContain("font-display");
    expect(html).toContain("GeoTrend");
  });

  it("renders mark-only variant and high-contrast paper tone cleanly", () => {
    const html = renderToStaticMarkup(
      createElement(BrandLogo, {
        variant: "mark",
        tone: "paper",
        size: 20,
        title: "GeoTrend seal",
      }),
    );
    expect(html).toContain('width="20"');
    expect(html).toContain('height="20"');
    expect(html).toContain('role="img"');
    expect(html).toContain("<title>GeoTrend seal</title>");
    expect(html).toContain("#14110F");
    expect(html).toContain("#5C5346");
    expect(html).toContain("#C1472E");
    expect(html).not.toContain("font-display");
  });

  it("draws crisp scalable vector geometry on HTML5 Canvas via drawBrandMarkOnCanvas", () => {
    const ops: string[] = [];
    const strokes: string[] = [];
    const fills: string[] = [];
    const mockCtx = {
      save: () => ops.push("save"),
      restore: () => ops.push("restore"),
      beginPath: () => ops.push("beginPath"),
      arc: (...args: unknown[]) => ops.push(`arc:${args.length}`),
      ellipse: (...args: unknown[]) => ops.push(`ellipse:${args.length}`),
      moveTo: () => ops.push("moveTo"),
      lineTo: () => ops.push("lineTo"),
      stroke: () => {
        strokes.push(String(mockCtx.strokeStyle));
        ops.push("stroke");
      },
      fill: () => {
        fills.push(String(mockCtx.fillStyle));
        ops.push("fill");
      },
      strokeStyle: "",
      fillStyle: "",
      lineWidth: 1,
      lineCap: "butt",
      lineJoin: "miter",
    } as unknown as CanvasRenderingContext2D;

    drawBrandMarkOnCanvas(mockCtx, { x: 72, y: 74, size: 32, tone: "paper" });

    expect(ops).toContain("save");
    expect(ops).toContain("ellipse:7");
    expect(ops.filter((op) => op === "stroke").length).toBeGreaterThanOrEqual(4);
    expect(strokes).toContain("#14110F");
    expect(strokes).toContain("#5C5346");
    expect(strokes).toContain("#C1472E");
    expect(fills).toContain("#C1472E");
    expect(ops[ops.length - 1]).toBe("restore");
  });

  it("integrates <BrandLogo /> in AppHeader and EvidenceCard DOM surfaces", () => {
    const headerHtml = renderToStaticMarkup(
      createElement(
        I18nProvider,
        null,
        createElement(AppHeader, {
          onNavigateSection: () => {},
          onNavigateMethods: () => {},
          onNavigateExplore: () => {},
          onNavigateHome: () => {},
        }),
      ),
    );
    expect(headerHtml).toContain('viewBox="0 0 32 32"');
    expect(headerHtml).toContain("#C1472E");
    expect(headerHtml).toContain("GeoTrend");

    const preset = getCasePresetById("01").result;
    const cardHtml = renderToStaticMarkup(
      createElement(EvidenceCard, { result: preset, locale: "en" }),
    );
    expect(cardHtml).toContain('viewBox="0 0 32 32"');
    expect(cardHtml).toContain("#14110F");
    expect(cardHtml).toContain("#C1472E");
    expect(cardHtml).toContain("GEOTREND · CASE FILE");

    const mockBirthday: BirthdayResult = {
      location: preset.location,
      birthDate: "1998-07-14",
      birthMonth: 7,
      effectiveStartYear: 1998,
      endYear: 2025,
      headline: {
        variable: "T2M",
        unit: "C",
        series: preset.series,
        stats: preset.stats,
        qValue: 0.001,
        fdrSignificant: true,
      },
      allScans: [],
    };
    const birthdayHtml = renderToStaticMarkup(
      createElement(BirthdayCard, {
        result: mockBirthday,
        tagline: "SINCE I WAS BORN · VILHENA, 1998",
        fullBirthDate: "July 14, 1998",
        monthlyLabel: "every July",
        statCaption: "warmer since 1998",
        headlineText: "July days warmed across the period.",
        badgeLabel: "Strong evidence",
        chartCaption: "Each bar is one year.",
      }),
    );
    expect(birthdayHtml).toContain("GeoTrend");
    expect(birthdayHtml).not.toContain("EarthTrend");
  });

  it("provides the full synced SVG + high-resolution PNG brand kit under public/", () => {
    const requiredSvgs = [
      "public/favicon.svg",
      "public/brand/favicon.svg",
      "public/brand/logo-mark-dark.svg",
      "public/brand/logo-mark-paper.svg",
      "public/brand/logo-wordmark.svg",
      "public/brand/logo-wordmark-dark.svg",
      "public/brand/logo-wordmark-paper.svg",
      "public/brand/og-card.svg",
      "public/brand/slide-cover-16x9.svg",
    ];
    for (const rel of requiredSvgs) {
      const full = resolve(ROOT, rel);
      expect(existsSync(full), `Missing SVG asset: ${rel}`).toBe(true);
      const raw = readFileSync(full, "utf8");
      expect(raw, `${rel} must contain SVG markup and terracotta #C1472E accent`).toContain("<svg");
      expect(raw.toUpperCase()).toContain("#C1472E");
    }

    const requiredPngs = [
      "public/brand/favicon-512.png",
      "public/brand/logo-mark-dark.png",
      "public/brand/logo-mark-paper.png",
      "public/brand/logo-wordmark-dark.png",
      "public/brand/logo-wordmark-paper.png",
      "public/brand/og-card.png",
      "public/brand/slide-cover-16x9.png",
    ];
    for (const rel of requiredPngs) {
      const full = resolve(ROOT, rel);
      expect(existsSync(full), `Missing PNG deliverable: ${rel}`).toBe(true);
      expect(hasPngSignature(full), `Invalid PNG signature in ${rel}`).toBe(true);
    }

    const indexHtml = readFileSync(resolve(ROOT, "index.html"), "utf8");
    expect(indexHtml).toContain('href="/favicon.svg"');
    expect(indexHtml).toContain("/brand/favicon-512.png");
    expect(indexHtml).toContain("/brand/og-card.png");
  });
});
