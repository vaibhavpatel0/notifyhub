import { describe, expect, it } from "vitest";
import { isoToZoned, refLabel, zonedToIso } from "@/lib/format";

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
