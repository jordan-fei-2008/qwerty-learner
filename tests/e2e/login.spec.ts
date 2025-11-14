import { test, expect } from '@playwright/test'

// Note: These tests use the existing test user 'testuser3' with password 'testpass123'
// Make sure the backend database contains this user

test.describe('User Login', () => {
  const validUsername = 'testuser3'
  const validPassword = 'testpass123'

  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure clean state
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
  })

  test('T044: login loads progress from server', async ({ page }) => {
    await page.goto('/login')

    // Fill login form
    await page.fill('input[name="username"]', validUsername)
    await page.fill('input[name="password"]', validPassword)

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for redirect to home page
    await page.waitForURL('/', { timeout: 5000 })

    // Verify auth token is stored
    const authToken = await page.evaluate(() => localStorage.getItem('authToken'))
    expect(authToken).not.toBeNull()
    expect(authToken).not.toBe('')

    // Verify username is stored
    const username = await page.evaluate(() => localStorage.getItem('username'))
    expect(username).toBe(validUsername)

    // Verify progress is loaded from server
    const progressStr = await page.evaluate(() => localStorage.getItem('userProgress'))
    expect(progressStr).not.toBeNull()

    const progress = JSON.parse(progressStr || '{}')

    // Check progress has expected structure
    expect(progress).toHaveProperty('masteredWords')
    expect(progress).toHaveProperty('familiarity')
    expect(progress).toHaveProperty('reviewQueue')
    expect(progress).toHaveProperty('stats')
    expect(progress.stats).toHaveProperty('totalLearned')
    expect(progress.stats).toHaveProperty('todayLearned')
    expect(progress.stats).toHaveProperty('streakDays')

    console.log(`✅ Successfully logged in as ${validUsername}`)
    console.log(`   Progress loaded: ${progress.masteredWords?.length || 0} mastered words`)
  })

  test('T045: invalid credentials show error', async ({ page }) => {
    await page.goto('/login')

    // Try login with wrong password
    await page.fill('input[name="username"]', validUsername)
    await page.fill('input[name="password"]', 'wrongpassword123')

    await page.click('button[type="submit"]')

    // Wait for error message
    await page.waitForTimeout(2000)

    // Should show error message
    const errorVisible = await page.locator('text=/用户名或密码错误|Invalid username or password/i').isVisible()
    expect(errorVisible).toBeTruthy()

    // Should stay on login page
    const currentUrl = page.url()
    expect(currentUrl).toContain('/login')

    // Should NOT have auth token
    const authToken = await page.evaluate(() => localStorage.getItem('authToken'))
    expect(authToken).toBeNull()

    console.log('✅ Invalid credentials correctly rejected')
  })

  test('invalid username shows error', async ({ page }) => {
    await page.goto('/login')

    // Try login with non-existent user
    await page.fill('input[name="username"]', 'nonexistentuser99999')
    await page.fill('input[name="password"]', 'anypassword')

    await page.click('button[type="submit"]')

    await page.waitForTimeout(2000)

    // Should show error
    const errorVisible = await page.locator('text=/用户名或密码错误|Invalid username or password/i').isVisible()
    expect(errorVisible).toBeTruthy()

    console.log('✅ Non-existent user correctly rejected')
  })

  test('validates required fields', async ({ page }) => {
    await page.goto('/login')

    // Try to submit empty form
    await page.click('button[type="submit"]')

    await page.waitForTimeout(500)

    // HTML5 validation should prevent submission
    const usernameInput = page.locator('input[name="username"]')
    const isInvalid = await usernameInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
    expect(isInvalid).toBeTruthy()

    console.log('✅ Form validation working')
  })

  test('shows loading state during login', async ({ page }) => {
    await page.goto('/login')

    await page.fill('input[name="username"]', validUsername)
    await page.fill('input[name="password"]', validPassword)

    // Click submit and immediately check for loading state
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // Button should show loading text
    const loadingText = await submitButton.textContent()
    expect(loadingText).toContain('登录中')

    console.log('✅ Loading state displayed')
  })
})
