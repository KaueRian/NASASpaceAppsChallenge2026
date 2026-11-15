import { describe, expect, it } from "vitest";
import { validateBirthdayQuery } from "../src/lib/validation/birthday.ts";

const VILHENA = { lat: "-12.7406", lon: "-60.1458", label: "Vilhena, RO" };

describe("validateBirthdayQuery", () => {
  it("accepts a plausible adult birth date and derives month/effective start year", () => {
    const res = validateBirthdayQuery({ birthDate: "1990-07-14", ...VILHENA });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.birthYear).toBe(1990);
    expect(res.data.birthMonth).toBe(7);
    expect(res.data.effectiveStartYear).toBe(1990);
    expect(res.data.lat).toBe(-12.7406);
  });

  it("clamps effectiveStartYear to 1981 for births before NASA POWER coverage, not the literal birth year", () => {
    const res = validateBirthdayQuery({ birthDate: "1970-03-02", ...VILHENA });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.birthYear).toBe(1970);
    expect(res.data.effectiveStartYear).toBe(1981);
  });

  it("rejects a birth date in the future", () => {
    const futureYear = new Date().getUTCFullYear() + 1;
    const res = validateBirthdayQuery({ birthDate: `${futureYear}-01-01`, ...VILHENA });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("INVALID_BIRTH_DATE");
  });

  it("rejects a birth date too recent to have 15 years of data", () => {
    const currentYear = new Date().getUTCFullYear();
    const res = validateBirthdayQuery({ birthDate: `${currentYear - 5}-01-01`, ...VILHENA });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("INSUFFICIENT_YEARS");
  });

  it("rejects malformed or non-calendar dates", () => {
    const malformed = validateBirthdayQuery({ birthDate: "not-a-date", ...VILHENA });
    expect(malformed.ok).toBe(false);
    if (!malformed.ok) expect(malformed.code).toBe("INVALID_BIRTH_DATE");

    const impossible = validateBirthdayQuery({ birthDate: "1990-02-30", ...VILHENA });
    expect(impossible.ok).toBe(false);
    if (!impossible.ok) expect(impossible.code).toBe("INVALID_BIRTH_DATE");
  });

  it("rejects implausibly old birth years", () => {
    const res = validateBirthdayQuery({ birthDate: "1850-01-01", ...VILHENA });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("INVALID_BIRTH_DATE");
  });

  it("rejects out-of-bounds coordinates", () => {
    const res = validateBirthdayQuery({ birthDate: "1990-07-14", lat: "91", lon: "0" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("INVALID_COORDINATES");
  });
});
