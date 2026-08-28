import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("site icon assets", () => {
  it("uses the purple brand mark for the app router favicon svg", () => {
    const iconSvg = readFileSync(
      join(process.cwd(), "src/app/icon.svg"),
      "utf8",
    );

    expect(iconSvg).toContain("#40217C");
    expect(iconSvg).not.toContain("#FFFFFF;");
    expect(iconSvg).toContain('fill="#FFFFFF"');
  });
});
