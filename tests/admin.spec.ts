import { test, expect } from '@playwright/test'

const adminEnabled = Boolean(
  process.env.PLAYWRIGHT_ADMIN_USERNAME &&
  process.env.PLAYWRIGHT_ADMIN_PASSWORD &&
  process.env.PLAYWRIGHT_ADMIN_TOTP
)

test.describe('Admin Console', () => {
  test.skip(!adminEnabled, 'Admin Playwright flow requires PLAYWRIGHT_ADMIN_* env vars')

  test('admin can open the dashboard and a device session view', async ({ page }) => {
    await page.goto('/admin/login')

    await page.getByLabel('Admin Username').fill(process.env.PLAYWRIGHT_ADMIN_USERNAME!)
    await page.getByLabel('Password').fill(process.env.PLAYWRIGHT_ADMIN_PASSWORD!)
    await page.getByLabel('TOTP Code').fill(process.env.PLAYWRIGHT_ADMIN_TOTP!)
    await page.getByRole('button', { name: /enter admin console/i }).click()

    await expect(page.getByRole('heading', { name: /admin device dashboard/i })).toBeVisible()

    await page.getByRole('link', { name: /desktop/i }).first().click()
    await expect(page.locator('iframe')).toBeVisible()
  })
})
