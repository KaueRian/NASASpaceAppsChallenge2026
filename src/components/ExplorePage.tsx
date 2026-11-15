import { useRef, useState } from "react";
import { useI18n } from "../i18n/i18n";
import { analyzeBirthday } from "../lib/nasa/birthdayAnalysis";
import { ClientInvestigationError } from "../lib/nasa/clientInvestigate";
import { DIRECTION_BG, DIRECTION_COLOR, UNIT_SUFFIX } from "../lib/resultDisplay";
import { validateBirthdayQuery } from "../lib/validation/birthday";
import type { BirthdayResult } from "../types/birthday";
import type { GeocodeCandidate, InvestigationErrorCode } from "../types/investigation";
import { CitySearchInput } from "./CitySearchInput";
import {
  BirthdayCard,
  type BirthdayCardCopy,
  downloadBirthdayCardPng,
  shareBirthdayCardPng,
} from "./share";

export interface ExplorePageProps {
  onNavigateHome: () => void;
}

type HubView = "hub" | "timeline";
/** "scanning" is intentionally NOT a step here — it's a transient `loading` flag overlaid on the
 * "input" step instead (see below). Making it a real step previously let Back-navigation from
 * "reveal" land on it, where there were no Back/Next controls and no re-fetch trigger: a dead end. */
type Step = "input" | "reveal" | "context" | "badge" | "share";

const ALL_STEPS: Step[] = ["input", "reveal", "context", "badge", "share"];
const STORY_STEPS: Step[] = ["reveal", "context", "badge", "share"];
/** Alternates bold direction-color ("impact" beats: the big stat, the badge stamp) with the
 * app's own dark surface ("reading"/chrome beats: long sentences, and the share step's chrome —
 * which also makes the colorful card preview pop against a neutral background instead of
 * blending into a same-color backdrop). Keeps the hue semantically tied to the one result
 * (unlike cycling through unrelated colors per slide, which would clash with how direction
 * color is used everywhere else in the app). */
const DARK_STEPS: Step[] = ["input", "context", "share"];
/** Pure-display steps (no form fields or buttons of their own) where tapping left/right of
 * center navigates back/forward, Stories-style. Excludes "share" (real buttons live there —
 * a tap-anywhere handler would double-fire alongside a button's own click) and "input"/"scanning"
 * (form fields need normal clicks). */
const TAP_NAV_STEPS: Step[] = ["reveal", "context", "badge"];

function monthNameFor(month: number, locale: "en" | "pt"): string {
  const date = new Date(Date.UTC(2000, month - 1, 1));
  return date.toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US", {
    month: "long",
    timeZone: "UTC",
  });
}

/** Formats raw `DDMMYYYY` digits (as typed) into `dd/mm/yyyy`, inserting the "/" automatically
 * as each segment fills — friendlier for non-technical users than the native date picker, whose
 * UI (calendar vs. three separate spinners) varies unpredictably across browsers/devices. */
function formatBirthDateDigits(digits: string): string {
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  let out = day;
  if (digits.length > 2) out += `/${month}`;
  if (digits.length > 4) out += `/${year}`;
  return out;
}

/** Converts complete `DDMMYYYY` digits into the ISO `yyyy-mm-dd` string the validation/analysis
 * pipeline expects; returns "" while incomplete (the submit validation surfaces the real error). */
function birthDateDigitsToIso(digits: string): string {
  if (digits.length !== 8) return "";
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return `${year}-${month}-${day}`;
}

function fullBirthDateFor(iso: string, locale: "en" | "pt"): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(locale === "pt" ? "pt-BR" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function ExplorePage({ onNavigateHome }: ExplorePageProps) {
  const { t, locale, formatNumber } = useI18n();

  const [hubView, setHubView] = useState<HubView>("hub");
  const [step, setStep] = useState<Step>("input");

  const [birthDate, setBirthDate] = useState("");
  const [birthDateDigits, setBirthDateDigits] = useState("");
  const [location, setLocation] = useState<GeocodeCandidate | null>(null);
  const [locating, setLocating] = useState(false);
  const [errorCode, setErrorCode] = useState<InvestigationErrorCode | null>(null);
  const [result, setResult] = useState<BirthdayResult | null>(null);
  const [detectiveOpen, setDetectiveOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [loading, setLoading] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const formatPValue = (p: number) =>
    p < 0.001 ? "< 0.001" : formatNumber(p, { maximumFractionDigits: 3 });

  const headline = result?.headline;
  const hasBadge = headline ? headline.stats.verdict !== "INSUFFICIENT_EVIDENCE" : true;
  const activeSteps = ALL_STEPS.filter((s) => s !== "badge" || hasBadge);
  const currentIndex = activeSteps.indexOf(step);
  const isStoryStep = STORY_STEPS.includes(step) && (step !== "badge" || hasBadge);

  const goNext = () => {
    const next = activeSteps[currentIndex + 1];
    if (next) setStep(next);
  };
  const goBack = () => {
    const prev = activeSteps[currentIndex - 1];
    if (prev) setStep(prev);
  };

  const enterTimeline = () => {
    setHubView("timeline");
    setStep("input");
    setResult(null);
    setErrorCode(null);
    setDetectiveOpen(false);
    setBirthDateDigits("");
    setBirthDate("");
    setLoading(false);
  };

  const handleBirthDateInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    setBirthDateDigits(digits);
    setBirthDate(birthDateDigitsToIso(digits));
  };

  const backToHub = () => {
    setHubView("hub");
  };

  const runAnalysis = async (lat: number, lon: number, label?: string) => {
    const validation = validateBirthdayQuery({
      birthDate,
      lat: String(lat),
      lon: String(lon),
      label,
    });
    if (!validation.ok) {
      setErrorCode(validation.code);
      setResult(null);
      return;
    }

    setLoading(true);
    setErrorCode(null);
    try {
      const next = await analyzeBirthday({
        lat: validation.data.lat,
        lon: validation.data.lon,
        label: validation.data.label,
        birthDate: validation.data.birthDate,
        birthMonth: validation.data.birthMonth,
        effectiveStartYear: validation.data.effectiveStartYear,
        endYear: validation.data.endYear,
      });
      setResult(next);
      setDetectiveOpen(false);
      setStep("reveal");
    } catch (err) {
      const code = err instanceof ClientInvestigationError ? err.code : "NASA_UPSTREAM_ERROR";
      setErrorCode(code);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) {
      setErrorCode("INVALID_COORDINATES");
      return;
    }
    await runAnalysis(location.lat, location.lon, location.label);
  };

  const handleUseLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const lat = Math.round(position.coords.latitude * 100) / 100;
        const lon = Math.round(position.coords.longitude * 100) / 100;
        const candidate: GeocodeCandidate = {
          name: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
          country: "",
          label: `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
          lat,
          lon,
        };
        setLocation(candidate);
        void runAnalysis(lat, lon, candidate.label);
      },
      () => {
        // Denied/unsupported: fall back silently to manual city search.
        setLocating(false);
      },
      { timeout: 8000 },
    );
  };

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!TAP_NAV_STEPS.includes(step)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width / 2) goBack();
    else goNext();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX === null) return;
    const endX = e.changedTouches[0]?.clientX ?? startX;
    const delta = endX - startX;
    if (Math.abs(delta) < 50) return;
    if (delta < 0) goNext();
    else goBack();
  };

  const monthName = result ? monthNameFor(result.birthMonth, locale) : "";
  const monthlyLabel = result ? t("explore.timeline.cardEveryMonth", { month: monthName }) : "";
  const fullBirthDate = result ? fullBirthDateFor(result.birthDate, locale) : "";
  const tagline = result
    ? t("explore.timeline.cardTagline", {
        location: result.location.label.split(",")[0]?.trim() ?? result.location.label,
        year: result.birthDate.slice(0, 4),
      })
    : "";

  const headlineText = headline
    ? t(`explore.timeline.headline.${headline.stats.direction}`, {
        month: monthName,
        location: result?.location.label ?? "",
        startYear: String(result?.effectiveStartYear ?? ""),
        totalChange: formatNumber(Math.abs(headline.stats.totalChangeOverPeriod), {
          maximumFractionDigits: 1,
        }),
        unit: UNIT_SUFFIX[headline.unit]?.trim() ?? "",
        perDecade: formatNumber(Math.abs(headline.stats.senSlopePerDecade), {
          maximumFractionDigits: 1,
        }),
        pValue: formatPValue(headline.stats.pValue),
      })
    : "";

  const badgeLabel = headline ? t(`explore.timeline.badge.${headline.stats.verdict}`) : "";
  const statCaption = headline
    ? t(`explore.timeline.statCaption.${headline.stats.direction}`, {
        startYear: String(result?.effectiveStartYear ?? ""),
      })
    : "";
  const chartCaption = t("explore.timeline.chartCaption");
  const showCoverageNote =
    result !== null && String(result.effectiveStartYear) !== result.birthDate.slice(0, 4);
  const bgClass = headline ? DIRECTION_BG[headline.stats.direction] : "bg-surface";
  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  const cardCopy: BirthdayCardCopy = {
    tagline,
    fullBirthDate,
    monthlyLabel,
    statCaption,
    headlineText,
    badgeLabel,
    chartCaption,
  };

  if (hubView === "hub") {
    return (
      <section className="border-b border-border px-4 py-8 sm:px-6 sm:py-10">
        <button
          type="button"
          onClick={onNavigateHome}
          className="mb-6 font-mono text-xs text-accent hover:underline"
        >
          {t("methods.backToHome")}
        </button>

        <header className="mb-6">
          <p className="font-mono text-xs uppercase tracking-widest text-accent">
            {t("explore.hub.title")}
          </p>
          <p className="mt-1 max-w-2xl font-sans text-sm text-text-muted">
            {t("explore.hub.subtitle")}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            type="button"
            onClick={enterTimeline}
            className="border border-accent bg-surface p-5 text-left transition-colors hover:bg-bg"
          >
            <span className="text-3xl">🎂</span>
            <h3 className="mt-3 font-display text-lg text-text">{t("explore.timeline.navCard")}</h3>
            <p className="mt-2 font-sans text-xs text-text-muted">
              {t("explore.hub.timelineTeaser")}
            </p>
          </button>

          <div className="border border-border bg-bg/40 p-5 opacity-50">
            <span className="text-3xl">⚽</span>
            <h3 className="mt-3 font-display text-lg text-text-muted">
              {t("explore.hub.comingSoon1")}
            </h3>
            <span className="mt-2 inline-block border border-border px-2 py-0.5 font-mono text-[10px] uppercase text-text-muted">
              {t("explore.hub.comingSoonBadge")}
            </span>
          </div>

          <div className="border border-border bg-bg/40 p-5 opacity-50">
            <span className="text-3xl">🎵</span>
            <h3 className="mt-3 font-display text-lg text-text-muted">
              {t("explore.hub.comingSoon2")}
            </h3>
            <span className="mt-2 inline-block border border-border px-2 py-0.5 font-mono text-[10px] uppercase text-text-muted">
              {t("explore.hub.comingSoonBadge")}
            </span>
          </div>
        </div>
      </section>
    );
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-close, not keyboard-essential (Back button covers that)
    // biome-ignore lint/a11y/useKeyWithClickEvents: same — closing is also reachable via the visible Back button
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) backToHub();
      }}
    >
      <section
        className={`relative flex w-full max-w-md flex-col overflow-y-auto rounded-lg shadow-2xl transition-colors ${
          DARK_STEPS.includes(step) ? "bg-surface" : bgClass
        }`}
        style={{ minHeight: "min(640px, 88vh)", maxHeight: "92vh" }}
        onTouchStart={isStoryStep ? handleTouchStart : undefined}
        onTouchEnd={isStoryStep ? handleTouchEnd : undefined}
      >
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={backToHub}
            className={`font-mono text-xs hover:underline ${isStoryStep ? "opacity-80" : "text-accent"}`}
          >
            {t("explore.timeline.backToHub")}
          </button>
          {isStoryStep && (
            <div className="flex gap-1.5">
              {STORY_STEPS.filter((s) => s !== "badge" || hasBadge).map((s) => (
                <span
                  key={s}
                  className={`h-1 w-6 rounded-full ${s === step ? "opacity-100" : "opacity-30"}`}
                  style={{ backgroundColor: "currentColor" }}
                />
              ))}
            </div>
          )}
        </div>

        {/* biome-ignore lint/a11y/noStaticElementInteractions: Stories-style tap-to-navigate; the Back/Next buttons below give the same reachable, keyboard-accessible control */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: same — navigation is also reachable via the visible Back/Next buttons */}
        <div
          className={`flex flex-1 flex-col items-center justify-center px-4 py-6 text-center sm:px-6 ${
            TAP_NAV_STEPS.includes(step) ? "cursor-pointer" : ""
          }`}
          onClick={handleContentClick}
        >
          {step === "input" && loading && (
            <div className="max-w-sm">
              <p className="font-display text-2xl text-text">
                {t("explore.timeline.scanningTitle")}
              </p>
              <p className="mt-3 font-sans text-sm text-text-muted">
                {t("explore.timeline.scanningSubtitle")}
              </p>
            </div>
          )}

          {step === "input" && !loading && (
            <div className="w-full max-w-md text-left">
              <h2 className="font-display text-2xl text-text">{t("explore.timeline.navCard")}</h2>
              <p className="mt-2 font-sans text-sm text-text-muted">
                {t("explore.timeline.subtitle")}
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <label className="block font-mono text-xs text-text-muted">
                  {t("explore.timeline.birthDateLabel")}
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    required
                    value={formatBirthDateDigits(birthDateDigits)}
                    onChange={handleBirthDateInput}
                    placeholder="dd/mm/aaaa"
                    maxLength={10}
                    className="mt-1 block w-full border border-border bg-bg px-3 py-2.5 font-mono text-base text-text placeholder:text-text-muted"
                  />
                </label>

                <div className="block font-mono text-xs text-text-muted">
                  <span>{t("explore.timeline.locationLabel")}</span>
                  <div className="mt-1 block w-full">
                    <CitySearchInput
                      currentLabel={location?.label}
                      onSelect={(candidate) => setLocation(candidate)}
                      className="block w-full"
                      placeholder={t("explore.timeline.locationPlaceholder")}
                      showQuickSuggestions={false}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleUseLocation}
                  disabled={locating}
                  className="w-full border border-border px-3 py-2 font-mono text-xs uppercase tracking-wide text-text-muted hover:border-accent hover:text-text disabled:opacity-50"
                >
                  {locating
                    ? t("explore.timeline.locatingButton")
                    : t("explore.timeline.useLocationButton")}
                </button>

                <button
                  type="submit"
                  className="w-full border border-accent bg-accent px-3 py-3 font-mono text-sm uppercase tracking-wide text-bg hover:opacity-90"
                >
                  {t("explore.timeline.submitButton")}
                </button>

                {errorCode && (
                  <div className="border border-accent bg-bg p-3">
                    <p className="font-mono text-xs uppercase tracking-wide text-accent">
                      {t("errors.title")}
                    </p>
                    <p className="mt-1 font-sans text-sm text-text-muted">
                      {t(`errors.${errorCode}`)}
                    </p>
                  </div>
                )}
              </form>
            </div>
          )}

          {step === "reveal" && headline && (
            <div style={{ color: "#FBF6EC" }}>
              <p className="font-display text-7xl font-extrabold tracking-tight">
                {headline.stats.totalChangeOverPeriod > 0 ? "+" : ""}
                {formatNumber(headline.stats.totalChangeOverPeriod, { maximumFractionDigits: 1 })}
                {UNIT_SUFFIX[headline.unit]?.trim() ?? ""}
              </p>
              <p className="mt-2 font-sans text-lg">{statCaption}</p>
              <p className="mt-4 font-mono text-xs uppercase tracking-widest opacity-80">
                {monthlyLabel} · {result?.location.label}
              </p>
            </div>
          )}

          {step === "context" && headline && (
            <div className="max-w-md" style={{ color: "#FBF6EC" }}>
              <p className="font-display text-2xl leading-snug">{headlineText}</p>
              {showCoverageNote && (
                <p className="mt-4 font-mono text-[11px] opacity-70">
                  {t("explore.timeline.coverageNote", {
                    effectiveStartYear: String(result?.effectiveStartYear ?? ""),
                  })}
                </p>
              )}
            </div>
          )}

          {step === "badge" && headline && hasBadge && (
            <div className="max-w-sm" style={{ color: "#FBF6EC" }}>
              <span className="inline-block border px-3 py-1.5 font-mono text-sm uppercase tracking-widest">
                {badgeLabel}
              </span>
              {headline.stats.verdict === "STRONG_EVIDENCE" && (
                <p className="mt-4 font-sans text-sm opacity-90">
                  {t("explore.timeline.rarityFraming")}
                </p>
              )}
            </div>
          )}

          {step === "share" && result && headline && (
            <div className="flex w-full flex-col items-center">
              <div className="flex justify-center overflow-x-auto py-2">
                <BirthdayCard result={result} {...cardCopy} />
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                {canNativeShare && (
                  <button
                    type="button"
                    disabled={sharing}
                    onClick={async () => {
                      setSharing(true);
                      const shared = await shareBirthdayCardPng(result, cardCopy);
                      setSharing(false);
                      if (!shared) {
                        downloadBirthdayCardPng(result, cardCopy);
                      }
                    }}
                    className="rounded px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wide disabled:opacity-60"
                    style={{ backgroundColor: "#FBF6EC", color: "#14110F" }}
                  >
                    {sharing ? "…" : t("actions.share")}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => downloadBirthdayCardPng(result, cardCopy)}
                  className={
                    canNativeShare
                      ? "rounded border px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wide opacity-90"
                      : "rounded px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wide"
                  }
                  style={
                    canNativeShare
                      ? { borderColor: "#FBF6EC", color: "#FBF6EC" }
                      : { backgroundColor: "#FBF6EC", color: "#14110F" }
                  }
                >
                  {t("actions.downloadPng")}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setDetectiveOpen(true)}
                className="mt-4 font-mono text-xs underline opacity-80"
                style={{ color: "#FBF6EC" }}
              >
                {t("explore.timeline.detectiveLinkFromShare")}
              </button>
            </div>
          )}
        </div>

        {isStoryStep && (
          <div className="flex items-center justify-between px-4 py-4 sm:px-6">
            <button
              type="button"
              onClick={goBack}
              disabled={currentIndex === 0}
              className="font-mono text-xs uppercase tracking-wide opacity-80 hover:opacity-100 disabled:opacity-0"
            >
              {t("explore.timeline.stepBack")}
            </button>
            {step !== "share" && (
              <button
                type="button"
                onClick={goNext}
                className="font-mono text-xs font-bold uppercase tracking-wide opacity-90 hover:opacity-100"
              >
                {t("explore.timeline.stepNext")}
              </button>
            )}
          </div>
        )}

        {detectiveOpen && result && headline && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-bg p-4 sm:p-8">
            <div className="mx-auto max-w-3xl">
              <button
                type="button"
                onClick={() => setDetectiveOpen(false)}
                className="mb-6 font-mono text-xs text-accent hover:underline"
              >
                ESC / {t("explore.timeline.backToHub")}
              </button>

              <p className="font-mono text-xs uppercase tracking-wide text-text-muted">
                {t("explore.timeline.detectiveToggle")}
              </p>

              <div className="mt-4 overflow-x-auto border border-border bg-surface p-3">
                <p className="mb-2 font-mono text-xs uppercase tracking-wide text-text-muted">
                  {t("explore.timeline.scanTableTitle")}
                </p>
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-border text-text-muted">
                      <th className="py-1 pr-3">{t("explore.timeline.scanColVariable")}</th>
                      <th className="py-1 pr-3">{t("explore.timeline.scanColSlope")}</th>
                      <th className="py-1 pr-3">{t("explore.timeline.scanColPValue")}</th>
                      <th className="py-1">{t("explore.timeline.scanColQValue")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.allScans.map((scan) => (
                      <tr key={scan.variable} className="border-b border-border/50">
                        <td className="py-1.5 pr-3 text-text">
                          {t(`variables.${scan.variable}.shortLabel`)}
                          {scan.variable === headline.variable ? " ★" : ""}
                        </td>
                        <td className={`py-1.5 pr-3 ${DIRECTION_COLOR[scan.stats.direction]}`}>
                          {scan.stats.senSlopePerDecade > 0 ? "+" : ""}
                          {formatNumber(scan.stats.senSlopePerDecade, { maximumFractionDigits: 2 })}{" "}
                          {UNIT_SUFFIX[scan.unit]?.trim() ?? ""}/dec
                        </td>
                        <td className="py-1.5 pr-3 text-text-muted">
                          {formatPValue(scan.stats.pValue)}
                        </td>
                        <td className="py-1.5 text-text">
                          {formatPValue(scan.qValue)} {scan.fdrSignificant ? "✓" : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
