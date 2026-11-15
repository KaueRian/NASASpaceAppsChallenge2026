import { CASE_PRESETS } from "../data/presets";
import { useI18n } from "../i18n/i18n";
import { useOptionalTemperatureUnit } from "../i18n/temperatureUnit";
import { DIRECTION_COLOR } from "../lib/resultDisplay";
import { convertDeltaValue, getDisplayUnitLabel } from "../lib/temperatureUnit";

interface MethodsPageProps {
  onNavigateHome: () => void;
}

export function MethodsPage({ onNavigateHome }: MethodsPageProps) {
  const { t, formatNumber } = useI18n();
  const tempUnit = useOptionalTemperatureUnit();

  const limitationItems = [
    t("methods.limitations.gridItem"),
    t("methods.limitations.causationItem"),
    t("methods.limitations.regionalItem"),
    t("methods.limitations.autocorrelationItem"),
  ];

  const formatP = (p: number) =>
    p < 0.001 ? "< 0.001" : formatNumber(p, { maximumFractionDigits: 6 });

  return (
    <section className="px-4 py-8 sm:px-6 sm:py-10">
      <button
        type="button"
        onClick={onNavigateHome}
        className="font-mono text-xs text-accent hover:underline"
      >
        {t("methods.backToHome")}
      </button>

      <h1 className="mt-4 font-display text-2xl text-text sm:text-3xl">{t("methods.title")}</h1>
      <p className="mt-2 max-w-2xl font-sans text-sm text-text-muted">{t("methods.subtitle")}</p>

      <div className="mt-8 space-y-8">
        <div className="max-w-2xl">
          <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted">
            {t("methods.nasaData.title")}
          </h2>
          <p className="mt-2 font-sans text-sm leading-relaxed text-text">
            {t("methods.nasaData.body")}
          </p>
        </div>

        <div className="max-w-2xl">
          <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted">
            {t("methods.aggregation.title")}
          </h2>
          <p className="mt-2 font-sans text-sm leading-relaxed text-text">
            {t("methods.aggregation.body")}
          </p>
        </div>

        <div className="max-w-2xl">
          <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted">
            {t("methods.mannKendall.title")}
          </h2>
          <p className="mt-2 font-sans text-sm leading-relaxed text-text">
            {t("methods.mannKendall.body")}
          </p>
        </div>

        <div className="max-w-2xl">
          <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted">
            {t("methods.sensSlope.title")}
          </h2>
          <p className="mt-2 font-sans text-sm leading-relaxed text-text">
            {t("methods.sensSlope.body")}
          </p>
        </div>

        <div className="max-w-2xl">
          <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted">
            {t("methods.formulas.title")}
          </h2>
          <p className="mt-2 font-sans text-sm leading-relaxed text-text">
            {t("methods.formulas.body")}
          </p>
        </div>

        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted">
            {t("methods.validationTable.title")}
          </h2>
          <div className="mt-3 overflow-x-auto border border-border bg-surface p-3 sm:p-4">
            <table className="w-full min-w-[540px] text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th className="py-1.5 pr-4">{t("methods.validationTable.colLocation")}</th>
                  <th className="py-1.5 pr-4">{t("methods.validationTable.colVariable")}</th>
                  <th className="py-1.5 pr-4">{t("methods.validationTable.colSlope")}</th>
                  <th className="py-1.5">{t("methods.validationTable.colStats")}</th>
                </tr>
              </thead>
              <tbody>
                {CASE_PRESETS.map((preset) => {
                  const { stats, variable, season, unit } = preset.result;
                  const unitSuffix = getDisplayUnitLabel(unit, tempUnit);
                  const slopeDecade = convertDeltaValue(stats.senSlopePerDecade, unit, tempUnit);
                  const sign = slopeDecade > 0 ? "+" : "";
                  const ciLower =
                    stats.senSlopeCiLowerPerDecade !== undefined
                      ? convertDeltaValue(stats.senSlopeCiLowerPerDecade, unit, tempUnit)
                      : undefined;
                  const ciUpper =
                    stats.senSlopeCiUpperPerDecade !== undefined
                      ? convertDeltaValue(stats.senSlopeCiUpperPerDecade, unit, tempUnit)
                      : undefined;
                  return (
                    <tr key={preset.id} className="border-b border-border/60 last:border-b-0">
                      <td className="py-2 pr-4 text-text">{t(`cases.${preset.id}.title`)}</td>
                      <td className="py-2 pr-4 text-text-muted">
                        {t(`variables.${variable}.shortLabel`)} · {t(`seasons.${season}`)}
                      </td>
                      <td className={`py-2 pr-4 ${DIRECTION_COLOR[stats.direction]}`}>
                        {sign}
                        {formatNumber(slopeDecade, { maximumFractionDigits: 2 })} {unitSuffix}/dec
                        {ciLower !== undefined && ciUpper !== undefined && (
                          <span className="block text-[11px] text-text-muted">
                            [{formatNumber(ciLower, { maximumFractionDigits: 2 })},{" "}
                            {formatNumber(ciUpper, { maximumFractionDigits: 2 })}]
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-text-muted">
                        Z = {formatNumber(stats.zScore, { maximumFractionDigits: 2 })}, p ={" "}
                        {formatP(stats.pValue)}
                        {stats.rSquared !== undefined && (
                          <span className="block text-[11px]">
                            R² = {formatNumber(stats.rSquared, { maximumFractionDigits: 2 })} · r₁ ={" "}
                            {formatNumber(stats.lag1Autocorrelation ?? 0, {
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="max-w-2xl">
          <h2 className="font-mono text-xs uppercase tracking-widest text-text-muted">
            {t("methods.limitations.title")}
          </h2>
          <ul className="mt-2 space-y-2 font-sans text-sm leading-relaxed text-text-muted">
            {limitationItems.map((item) => (
              <li key={item} className="border-l border-border pl-3">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
