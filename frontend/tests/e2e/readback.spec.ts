import { expect, test } from "@playwright/test";

const caseId = process.env.E2E_CASE_ID;

test("dashboard never fabricates records", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Maintenance cases" })).toBeVisible();
  if (!process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) {
    await expect(page.getByText("No sample records are substituted.")).toBeVisible();
    await expect(page.locator(".case-card")).toHaveCount(0);
  }
});

test("known deployed certificate is responsive and linked", async ({ page }) => {
  test.skip(!caseId, "E2E_CASE_ID is required for deployed readback");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/cases/${caseId}`);
  await expect(page.getByText("COMPLIANT", { exact: true })).toBeVisible();
  await expect(page.getByText("COMPLIANCE CERTIFICATE")).toBeVisible();
  await expect(page.getByRole("link", { name: /view contract/i })).toHaveAttribute("href", /explorer-studio/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByText("Maintenance verified")).toBeVisible();
});
