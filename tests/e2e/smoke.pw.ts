import { expect, test } from "@playwright/test";

test("home exposes primary actions", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Sudoku for Focused Daily Play" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start puzzle" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Daily Challenge" })).toBeVisible();
});

test("play route loads board and controls", async ({ page }) => {
  await page.goto("/play/");

  await expect(page.getByLabel("Sudoku board")).toBeVisible();
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Redo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Notes" })).toBeVisible();
});

test("daily route opens puzzle and date selector", async ({ page }) => {
  await page.goto("/daily/");

  await expect(page.getByLabel("Sudoku board")).toBeVisible();
  await expect(page.getByRole("button", { name: "Select daily puzzle date" })).toBeVisible();
});

test("theme control cycles system light dark", async ({ page }) => {
  await page.goto("/privacy");

  const themeButton = page.getByRole("button", { name: /Theme:/ });
  await expect(themeButton).toHaveAttribute("aria-label", "Theme: system");

  await themeButton.click();
  await expect(themeButton).toHaveAttribute("aria-label", "Theme: light");
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("sudoku-theme-preference"))).toBe("light");

  await themeButton.click();
  await expect(themeButton).toHaveAttribute("aria-label", "Theme: dark");
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("sudoku-theme-preference"))).toBe("dark");

  await themeButton.click();
  await expect(themeButton).toHaveAttribute("aria-label", "Theme: system");
  await expect.poll(async () => page.evaluate(() => localStorage.getItem("sudoku-theme-preference"))).toBe("system");
});

test("mobile nav uses burger menu", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile-only navigation behavior");

  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation menu" }).click();

  await expect(page.getByRole("menuitem", { name: "Play" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Daily" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Guest" })).toBeVisible();
});
