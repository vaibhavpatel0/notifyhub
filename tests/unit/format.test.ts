import { describe, expect, it } from "vitest";
import { defaultCourseYears, formatYears, isoToZoned, ordinal, parseYears, refLabel, zonedToIso } from "@/lib/format";

describe("college timezone conversion", () => {
  it("converts Indian wall-clock time to UTC and back", () => {
    const iso = zonedToIso("2026-09-25", "10:30", "Asia/Kolkata");
    expect(iso).toBe("2026-09-25T05:00:00.000Z");
    expect(isoToZoned(iso, "Asia/Kolkata")).toEqual({ date: "2026-09-25", time: "10:30" });
  });
  it("handles zones with daylight saving", () => {
    expect(zonedToIso("2026-07-01", "09:00", "Europe/London")).toBe("2026-07-01T08:00:00.000Z");
  });
  it("formats circular numbers", () => {
    expect(refLabel(14, 2026)).toBe("No. 014/2026");
    expect(refLabel(null, 2026)).toBeNull();
  });
});


describe("student years", () => {
  it("writes ordinals", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd"]);
  });
  it("labels year lists", () => {
    expect(formatYears([])).toBe("All years");
    expect(formatYears([2])).toBe("2nd year");
    expect(formatYears([4, 2, 3, 3])).toBe("2nd, 3rd & 4th year");
    expect(formatYears([1, 4])).toBe("1st & 4th year");
  });
  it("parses form values, and every year means all years", () => {
    expect(parseYears(["3", "1", "1", "9", "x"], 4)).toEqual([1, 3]);
    expect(parseYears(["1", "2", "3", "4"], 4)).toEqual([]);
    expect(parseYears(["1", "2"], 2)).toEqual([]);
    expect(parseYears([], 4)).toEqual([]);
  });
});

describe("course length guess", () => {
  it("knows common programmes", () => {
    expect(defaultCourseYears("CSE", "Computer Science and Engineering")).toBe(4);
    expect(defaultCourseYears("MBA", "Master of Business Administration")).toBe(2);
    expect(defaultCourseYears("M.Tech", "M.Tech in VLSI")).toBe(2);
    expect(defaultCourseYears("ARCH", "School of Architecture")).toBe(5);
  });
});
