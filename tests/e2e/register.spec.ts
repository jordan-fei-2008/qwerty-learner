import { test, expect } from '@playwright/test'

// Note: These tests require both backend and frontend servers to be running
// Backend: cd backend && ./gradlew bootRun (port 8080)
// Frontend: npm run dev (port 5173)
// Update baseURL in playwright.config.ts to 'http://localhost:5173' for local testing

test.describe('User Registration', () => {
  // Generate unique username for each test run
  const timestamp = Date.now()
  const testUsername = `testuser_${timestamp}`
  const testPassword = 'Test123456'
  const testEmail = `${testUsername}@test.com`

  test.beforeEach(async ({ page }) => {
    // Override baseURL for local testing if needed
    // await page.goto('http://localhost:5173/register')
    await page.goto('/register')
  })

  test('T032: successful registration creates account and redirects', async ({ page }) => {
    // Fill registration form
    await page.fill('input[name="username"]', testUsername)
    await page.fill('input[name="password"]', testPassword)
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="securityQuestion"]', '你的第一个宠物叫什么？')
    await page.fill('input[name="securityAnswer"]', 'fluffy')

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for navigation to home page
    await page.waitForURL('/', { timeout: 5000 })

    // Verify user is logged in (check for auth token in localStorage)
    const authToken = await page.evaluate(() => localStorage.getItem('authToken'))
    expect(authToken).not.toBeNull()
    expect(authToken).not.toBe('')

    // Verify username is stored
    const username = await page.evaluate(() => localStorage.getItem('username'))
    expect(username).toBe(testUsername)

    console.log(`✅ Successfully registered user: ${testUsername}`)
  })

  test('T033: duplicate username registration shows error', async ({ page }) => {
    // Try to register with the same username again
    await page.fill('input[name="username"]', testUsername)
    await page.fill('input[name="password"]', testPassword)
    await page.fill('input[name="email"]', `another_${testEmail}`)
    await page.fill('input[name="securityQuestion"]', '你的第一个宠物叫什么？')
    await page.fill('input[name="securityAnswer"]', 'fluffy')

    // Submit form
    await page.click('button[type="submit"]')

    // Should stay on registration page and show error
    await page.waitForTimeout(2000)

    // Check for error message
    const errorMessage = await page.locator('text=/用户名已存在|已被使用/i').isVisible()
    expect(errorMessage).toBeTruthy()

    // Should NOT redirect (still on /register)
    const currentUrl = page.url()
    expect(currentUrl).toContain('/register')

    console.log('✅ Duplicate registration correctly rejected')
  })

  test('validates required fields', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]')

    // Should show validation errors
    await page.waitForTimeout(500)

    // Check if HTML5 validation is triggered or custom error messages shown
    const usernameInput = page.locator('input[name="username"]')
    const isInvalid = await usernameInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
    expect(isInvalid).toBeTruthy()

    console.log('✅ Form validation working')
  })

  test('validates username length (minimum 3 characters)', async ({ page }) => {
    await page.fill('input[name="username"]', 'ab') // Too short
    await page.fill('input[name="password"]', testPassword)
    await page.fill('input[name="securityQuestion"]', '测试问题')
    await page.fill('input[name="securityAnswer"]', '测试答案')

    await page.click('button[type="submit"]')

    await page.waitForTimeout(1000)

    // Should show error or stay on page
    const currentUrl = page.url()
    expect(currentUrl).toContain('/register')

    console.log('✅ Username length validation working')
  })

  test('validates password length (minimum 8 characters)', async ({ page }) => {
    await page.fill('input[name="username"]', `user_${Date.now()}`)
    await page.fill('input[name="password"]', 'short') // Too short
    await page.fill('input[name="securityQuestion"]', '测试问题')
    await page.fill('input[name="securityAnswer"]', '测试答案')

    await page.click('button[type="submit"]')

    await page.waitForTimeout(1000)

    // Should show error or stay on page
    const currentUrl = page.url()
    expect(currentUrl).toContain('/register')

    console.log('✅ Password length validation working')
  })
})
