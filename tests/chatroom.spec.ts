import { test, expect } from '@playwright/test'

test.describe('Chatroom Nexus', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/')
    
    // Check title or main heading
    await expect(page.locator('h1')).toContainText('Chatroom')
  })

  test('should show login form', async ({ page }) => {
    await page.goto('/')
    
    // Check login form elements exist
    await expect(page.getByPlaceholder('Username')).toBeVisible()
    await expect(page.getByPlaceholder('PIN')).toBeVisible()
    await expect(page.getByRole('button', { name: /login|continue/i })).toBeVisible()
  })

  test('should validate login form inputs', async ({ page }) => {
    await page.goto('/')
    
    // Fill short username
    const usernameInput = page.getByPlaceholder('Username')
    const pinInput = page.getByPlaceholder('PIN')
    
    await usernameInput.fill('ab')
    await pinInput.fill('1234')
    
    // Submit
    await page.getByRole('button', { name: /login|continue/i }).click()
    
    // Should show error
    await expect(page.locator('text=/username.*3.*char/i')).toBeVisible()
  })

  test('should register and create a room', async ({ page }) => {
    await page.goto('/')
    
    // Switch to register mode if needed
    const registerButton = page.getByRole('button', { name: /register|sign up/i })
    if (await registerButton.isVisible()) {
      await registerButton.click()
    }
    
    // Fill registration form
    const username = `testuser${Date.now().toString().slice(-6)}`
    await page.getByPlaceholder('Username').fill(username)
    await page.getByPlaceholder('PIN').fill('123456')
    
    // Submit
    await page.getByRole('button', { name: /create|register|sign up/i }).click()
    
    // Should show rooms list (we're logged in)
    await expect(page.getByText('Chatrooms')).toBeVisible({ timeout: 10000 })
  })
})
