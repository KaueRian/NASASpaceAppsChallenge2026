import {
  type BirthdayQueryInput,
  type BirthdayValidationResult,
  MIN_BIRTH_YEAR,
} from "../../types/birthday.ts";
import { DEFAULT_START_YEAR, MIN_ANALYSIS_YEARS } from "../../types/investigation.ts";

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseFiniteNumber(raw?: string): number | null {
  if (raw === undefined || raw.trim() === "") return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

/**
 * Validates a birth date + location for the "Your Timeline" feature.
 *
 * NASA POWER coverage starts in `DEFAULT_START_YEAR` (1981): a birth year before that is
 * accepted, but the analysis window clamps to 1981 (`effectiveStartYear`) rather than silently
 * reporting the wrong period as if it covered the user's literal birth year. Rejects birth
 * dates that leave fewer than `MIN_ANALYSIS_YEARS` of coverage between `effectiveStartYear` and
 * the current year (too-recent births), and future-dated or implausibly old birth dates.
 */
export function validateBirthdayQuery(input: BirthdayQueryInput): BirthdayValidationResult {
  const lat = parseFiniteNumber(input.lat);
  const lon = parseFiniteNumber(input.lon);
  if (lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return {
      ok: false,
      code: "INVALID_COORDINATES",
      message: "Latitude must be between -90 and 90, and longitude between -180 and 180.",
    };
  }

  const match = input.birthDate ? ISO_DATE_RE.exec(input.birthDate) : null;
  if (!match) {
    return {
      ok: false,
      code: "INVALID_BIRTH_DATE",
      message: "Birth date must be a valid ISO date (yyyy-mm-dd).",
    };
  }

  const birthYear = Number(match[1]);
  const birthMonth = Number(match[2]);
  const birthDay = Number(match[3]);
  const birthDateUtc = new Date(Date.UTC(birthYear, birthMonth - 1, birthDay));
  const isRealCalendarDate =
    birthDateUtc.getUTCFullYear() === birthYear &&
    birthDateUtc.getUTCMonth() === birthMonth - 1 &&
    birthDateUtc.getUTCDate() === birthDay;

  const now = new Date();
  const currentYear = now.getUTCFullYear();

  if (!isRealCalendarDate || birthYear < MIN_BIRTH_YEAR || birthDateUtc.getTime() > now.getTime()) {
    return {
      ok: false,
      code: "INVALID_BIRTH_DATE",
      message: `Birth date must be a real calendar date, not in the future, and no earlier than ${MIN_BIRTH_YEAR}.`,
    };
  }

  const effectiveStartYear = Math.max(birthYear, DEFAULT_START_YEAR);
  const endYear = currentYear;
  const yearsOfData = endYear - effectiveStartYear + 1;

  if (yearsOfData < MIN_ANALYSIS_YEARS) {
    return {
      ok: false,
      code: "INSUFFICIENT_YEARS",
      message: `At least ${MIN_ANALYSIS_YEARS} years of data are needed since ${effectiveStartYear}; only ${yearsOfData} are available yet.`,
    };
  }

  const trimmedLabel = input.label?.trim();

  return {
    ok: true,
    data: {
      birthDate: input.birthDate as string,
      birthYear,
      birthMonth,
      effectiveStartYear,
      endYear,
      lat,
      lon,
      ...(trimmedLabel ? { label: trimmedLabel.slice(0, 120) } : {}),
    },
  };
}
