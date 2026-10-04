import { test, expect } from "@playwright/test";

test.describe("Public navigation UX", () => {
  test("desktop header exposes login and sign up", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    const primaryNav = page.getByRole("navigation", { name: "Primary" });
    await expect(primaryNav.getByRole("link", { name: "Log in" })).toBeVisible();
    await expect(primaryNav.getByRole("link", { name: "Sign up" })).toBeVisible();
  });

  test("mobile menu exposes login and sign up first", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await page.getByRole("button", { name: "Open menu" }).click();
    const dialog = page.getByRole("dialog", { name: "Mobile navigation" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Log in" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Sign up" })).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test("homepage features next major competition copy", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/next major KIRAKITAH competition/i).first()).toBeVisible();
    await expect(page.getByText(/Commences 1 November 2026/i).first()).toBeVisible();
  });

  test("esports page features next major competition copy", async ({ page }) => {
    await page.goto("/esports");
    await expect(
      page.getByText(/next major KIRAKITAH Gaming championship/i).first(),
    ).toBeVisible();
  });

  test("login page links to forgot password and register", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: /Forgot password/i })).toHaveAttribute(
      "href",
      "/forgot-password",
    );
    await expect(page.getByRole("link", { name: /REGISTER/i })).toHaveAttribute(
      "href",
      "/register",
    );
  });

  test("footer participate links include login and fixtures", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("link", { name: "Log in" })).toHaveAttribute(
      "href",
      "/login",
    );
    await expect(footer.getByRole("link", { name: "Fixtures" })).toHaveAttribute(
      "href",
      "/matches",
    );
  });
});
