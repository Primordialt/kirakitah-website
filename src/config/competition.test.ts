import { describe, expect, it } from "vitest";
import {
  KG926_EDITION_COMMENCEMENT_SHORT,
  KG926_EDITION_MONTH_YEAR_LABEL,
  KG926_EDITION_START_DATE,
  KG926_EDITION_START_DISPLAY,
  KG926_EDITION_START_ISO,
} from "@/config/competition";

describe("KG926 edition configuration", () => {
  it("uses 1 November 2026 as the current edition start", () => {
    expect(KG926_EDITION_START_DATE).toBe("2026-11-01");
    expect(KG926_EDITION_START_ISO).toBe("2026-11-01T00:00:00.000Z");
    expect(KG926_EDITION_START_DISPLAY).toBe("1 November 2026");
    expect(KG926_EDITION_MONTH_YEAR_LABEL).toBe("November 2026");
    expect(KG926_EDITION_COMMENCEMENT_SHORT).toBe("Commences 1 November 2026.");
  });
});
