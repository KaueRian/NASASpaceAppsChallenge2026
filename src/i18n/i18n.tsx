import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { TemperatureUnitProvider } from "./temperatureUnit";
import { formatNumberForLocale, type Locale, translateForLocale } from "./translate";

export { formatNumberForLocale, type Locale, translateForLocale } from "./translate";

const STORAGE_KEY = "etd.locale";

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
    (key: string, params?: Record<string, string | number>) =>
      translateForLocale(locale, key, params),
    [locale],
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumberForLocale(locale, value, options),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, formatNumber }),
    [locale, setLocale, t, formatNumber],
  );

  return (
    <I18nContext.Provider value={value}>
      <TemperatureUnitProvider>{children}</TemperatureUnitProvider>
    </I18nContext.Provider>
  );
}

export function useOptionalI18n(): I18nContextValue | null {
  return useContext(I18nContext);
}

export function useResolvedI18n(explicitLocale?: Locale): {
  locale: Locale;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
} {
  const ctx = useContext(I18nContext);
  const resolvedLocale: Locale = explicitLocale ?? ctx?.locale ?? "en";

  if (ctx && resolvedLocale === ctx.locale) {
    return { locale: ctx.locale, t: ctx.t, formatNumber: ctx.formatNumber };
  }

  return {
    locale: resolvedLocale,
    t: (key, params) => translateForLocale(resolvedLocale, key, params),
    formatNumber: (value, options) => formatNumberForLocale(resolvedLocale, value, options),
  };
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within <I18nProvider>");
  return ctx;
}
