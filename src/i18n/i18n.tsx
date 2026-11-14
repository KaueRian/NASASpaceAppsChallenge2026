import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import en from "../locales/en.json";
import pt from "../locales/pt.json";

export type Locale = "en" | "pt";

const DICTS: Record<Locale, Record<string, unknown>> = { en, pt };
const STORAGE_KEY = "etd.locale";
const INTL_LOCALE: Record<Locale, string> = { en: "en-US", pt: "pt-BR" };

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "pt") return stored;
  } catch {
    // storage unavailable (private mode, disabled, etc.) — ignore, use default
  }
  // Future option (not wired in for R0 — default is fixed to "pt"):
  // const browserLocale = navigator.language.startsWith("pt") ? "pt" : "en";
  return "pt";
}

function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // ignore — nothing we can do if the write fails/throws
  }
}

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

function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const raw = resolvePath(DICTS[locale], key) ?? resolvePath(DICTS.en, key);
  if (raw === undefined) {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] missing key "${key}" in both "${locale}" and "en" dictionaries`);
    }
    return key;
  }
  return interpolate(raw, params);
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale],
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(INTL_LOCALE[locale], options).format(value),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, formatNumber }),
    [locale, setLocale, t, formatNumber],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}
