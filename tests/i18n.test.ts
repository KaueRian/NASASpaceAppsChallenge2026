import { describe, expect, it } from "vitest";
import en from "../src/locales/en.json";
import pt from "../src/locales/pt.json";

function collectKeys(dict: unknown, prefix = ""): string[] {
  if (typeof dict !== "object" || dict === null) return [];
  return Object.entries(dict as Record<string, unknown>).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "object" && value !== null ? collectKeys(value, path) : [path];
  });
}

describe("i18n dictionary key parity", () => {
  it("en.json and pt.json have the exact same set of keys", () => {
    expect(collectKeys(pt).sort()).toEqual(collectKeys(en).sort());
  });
});
