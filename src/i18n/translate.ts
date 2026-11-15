import en from "../locales/en.json";
import pt from "../locales/pt.json";

export type Locale = "en" | "pt";

const DICTS: Record<Locale, Record<string, unknown>> = { en, pt };
const INTL_LOCALE: Record<Locale, string> = { en: "en-US", pt: "pt-BR" };

function resolvePath(dict: Record<string, unknown>, path: string): string | undefined {
  const value = path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        typeof node === "object" && node !== null
          ? (node as Record<string, unknown>)[key]
          : undefined,
      dict,
    );
  return typeof value === "string" ? value : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name) =>
    name in params ? String(params[name]) : match,
  );
}

/**
 * Resolves and interpolates an i18n dictionary key for the specified locale,
 * falling back to English (`en`) when a localized entry is missing.
 */
export function translateForLocale(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const raw = resolvePath(DICTS[locale], key) ?? resolvePath(DICTS.en, key);
  if (raw === undefined) {
    const isDev =
      typeof import.meta !== "undefined" &&
      Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
    if (isDev) {
      console.warn(`[i18n] missing key "${key}" in both "${locale}" and "en" dictionaries`);
    }
    return key;
  }
  return interpolate(raw, params);
}

/**
 * Formats a number according to the regional conventions for `locale` (`en-US` or `pt-BR`).
 */
export function formatNumberForLocale(
  locale: Locale,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], options).format(value);
}
