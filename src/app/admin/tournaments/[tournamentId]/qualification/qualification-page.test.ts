import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const pagePath = join(
  process.cwd(),
  "src/app/admin/tournaments/[tournamentId]/qualification/page.tsx",
);

describe("Admin qualification page", () => {
  it("imports podFillLabel from a server-safe module, not the client actions bundle", () => {
    const source = readFileSync(pagePath, "utf8");
    expect(source).toContain('@/lib/admin/pod-fill-label');
    expect(source).not.toMatch(
      /import\s*\{[^}]*podFillLabel[^}]*\}\s*from\s*"@\/components\/admin\/QualificationActions"/,
    );
  });

  it("includes Auto Assign control for tournament pod managers", () => {
    const source = readFileSync(pagePath, "utf8");
    expect(source).toContain("QualificationAutoAssignButton");
    expect(source).toContain("canManage");
  });
});
