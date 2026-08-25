import { test, expect } from "@playwright/test";

async function mockLogin(page: import("@playwright/test").Page, role: string) {
  await page.goto("/admin/login");
  const unavailable = page.getByRole("heading", {
    name: /Admin sign-in unavailable/i,
  });
  if (await unavailable.isVisible().catch(() => false)) {
    test.skip(true, "Admin auth unavailable in this environment");
  }

  const roleSelect = page.locator("#admin-role");
  if (!(await roleSelect.isVisible().catch(() => false))) {
    test.skip(true, "Mock admin login (role picker) not available");
  }

  await page.getByLabel(/Email/i).fill(`${role.toLowerCase()}@example.com`);
  await roleSelect.selectOption(role);
  await page.getByRole("button", { name: /Sign in/i }).click();
  await expect(page).toHaveURL(/\/admin/);
}

test.describe("Admin user management (mock auth)", () => {
  test("SUPER_ADMIN can open Administrators; REVIEWER cannot", async ({
    page,
  }) => {
    await mockLogin(page, "SUPER_ADMIN");
    await expect(
      page.getByRole("link", { name: "Administrators" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Administrators" }).click();
    await expect(
      page.getByRole("heading", { name: /Manage Administrators/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Create administrator/i }),
    ).toBeVisible();

    await page.context().clearCookies();
    await page.goto("/admin/login");
    await mockLogin(page, "REVIEWER");
    await expect(
      page.getByRole("link", { name: "Administrators" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Applications" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Identity reviews" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Social reviews" }),
    ).toBeVisible();

    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin\/forbidden/);
  });
});
