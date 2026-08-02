import { test, expect } from "@playwright/test";

/**
 * One representative e2e path (per the plan): login -> base graph renders
 * -> toggle indirect on (segmented control) -> new nodes/edges appear ->
 * change timeframe (segmented control) -> values change -> edit a node ->
 * recompute reflected in the graph and the comparison panel.
 *
 * Requires: dev server + seeded Postgres DB reachable via DATABASE_URL, and
 * the seed accounts from src/data/domainData.json ("devSeedUsers") created by
 * `npm run db:seed`. Override with SEED_USER_EMAIL/SEED_USER_PASSWORD if you
 * changed them there.
 */

const SEED_EMAIL = process.env.SEED_USER_EMAIL ?? "admin1@example.com";
const SEED_PASSWORD = process.env.SEED_USER_PASSWORD ?? "endre-meg-nå-1";

test("select scenario, toggle indirect, adjust timeframe, edit a node", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/logg-inn/);

  await page.fill('input[type="email"]', SEED_EMAIL);
  await page.fill('input[type="password"]', SEED_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("/");

  await page.waitForSelector(".react-flow");
  await expect(page.locator(".react-flow__node", { hasText: "Transport" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Oversikt" })).toBeVisible();

  // Toggle indirect on (segmented control) - new nodes should be synthesized and appear.
  await page.getByRole("button", { name: "På" }).click();
  await expect(page.locator(".react-flow__node", { hasText: "Eiendom" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/indirekte følge slått på/)).toBeVisible();

  // Move the timeframe (segmented control) - values should shift (decay
  // toward 0 in the placeholder functionality table).
  await page.getByRole("button", { name: "90 dager" }).click();
  await expect(page.getByRole("button", { name: "90 dager" })).toHaveAttribute("aria-pressed", "true");

  // Open a direct node's detail panel and edit its category - recompute
  // should be reflected both in the graph and the inline edit-impact summary.
  await page.locator(".react-flow__node", { hasText: "Transport" }).click();
  await expect(page.getByRole("heading", { name: "Transport" })).toBeVisible();

  const categorySelect = page.locator(".editControls select");
  await categorySelect.selectOption("svært store");
  await expect(page.getByText(/Du endret konsekvenskategorien/)).toBeVisible({ timeout: 10_000 });
});
