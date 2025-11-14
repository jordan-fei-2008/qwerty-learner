import { test, expect } from '@playwright/test'

test.describe('Password Reset', () => {
  // Use existing test user
  const testUsername = 'testuser3'
  const testPassword = 'testpass123'
  const newPassword = 'newpass456'
  // Note: Actual security question/answer depend on what was set during registration
  // For testuser3, assuming default test values
  const securityAnswer = 'fluffy' // This depends on actual DB data

  test.beforeEach(async ({ page }) => {
    await page.goto('/reset-password')
  })

  test('T071: password reset success flow', async ({ page }) => {
    // Step 1: Enter username
    await page.fill('input[name="username"]', testUsername)
    await page.click('button[type="submit"]:has-text("下一步")')

    // Wait for security question to load
    await page.waitForTimeout(2000)

    // Should show security question
    const questionVisible = await page.locator('text=/安全问题/i').isVisible()
    expect(questionVisible).toBeTruthy()

    console.log('✅ Security question loaded')

    // Step 2: Answer security question and set new password
    await page.fill('input[name="securityAnswer"]', securityAnswer)
    await page.fill('input[name="newPassword"]', newPassword)
    await page.fill('input[name="confirmPassword"]', newPassword)

    await page.click('button[type="submit"]:has-text("重置密码")')

    // Wait for success message
    await page.waitForTimeout(2000)

    // Should show success message
    const successVisible = await page.locator('text=/密码重置成功/i').isVisible()
    expect(successVisible).toBeTruthy()

    console.log('✅ Password reset success message shown')

    // Click go to login
    await page.click('button:has-text("前往登录")')

    // Should navigate to login page
    await page.waitForURL('/login', { timeout: 3000 })

    // Try logging in with new password
    await page.fill('input[name="username"]', testUsername)
    await page.fill('input[name="password"]', newPassword)
    await page.click('button[type="submit"]')

    // Should successfully login
    await page.waitForURL('/', { timeout: 5000 })

    // Verify logged in (has auth token)
    const authToken = await page.evaluate(() => localStorage.getItem('authToken'))
    expect(authToken).not.toBeNull()

    console.log('✅ Successfully logged in with new password')

    // Reset password back to original for other tests
    await page.goto('/reset-password')
    await page.fill('input[name="username"]', testUsername)
    await page.click('button[type="submit"]:has-text("下一步")')
    await page.waitForTimeout(2000)
    await page.fill('input[name="securityAnswer"]', securityAnswer)
    await page.fill('input[name="newPassword"]', testPassword)
    await page.fill('input[name="confirmPassword"]', testPassword)
    await page.click('button[type="submit"]:has-text("重置密码")')
    await page.waitForTimeout(2000)

    console.log('✅ Password reset back to original')
  })

  test('T072: wrong security answer rejected', async ({ page }) => {
    // Step 1: Enter username
    await page.fill('input[name="username"]', testUsername)
    await page.click('button[type="submit"]:has-text("下一步")')

    await page.waitForTimeout(2000)

    // Step 2: Enter wrong security answer
    await page.fill('input[name="securityAnswer"]', 'wrong_answer_12345')
    await page.fill('input[name="newPassword"]', 'somepassword123')
    await page.fill('input[name="confirmPassword"]', 'somepassword123')

    await page.click('button[type="submit"]:has-text("重置密码")')

    await page.waitForTimeout(2000)

    // Should show error message
    const errorVisible = await page.locator('text=/安全问题答案错误|Incorrect/i').isVisible()
    expect(errorVisible).toBeTruthy()

    // Should still be on the answer page (not success)
    const questionStillVisible = await page.locator('text=/安全问题/i').isVisible()
    expect(questionStillVisible).toBeTruthy()

    console.log('✅ Wrong security answer correctly rejected')
  })

  test('nonexistent username shows error', async ({ page }) => {
    await page.fill('input[name="username"]', 'nonexistent_user_999999')
    await page.click('button[type="submit"]:has-text("下一步")')

    await page.waitForTimeout(2000)

    // Should show error
    const errorVisible = await page.locator('text=/用户不存在|not found/i').isVisible()
    expect(errorVisible).toBeTruthy()

    // Should not proceed to security question step
    const questionNotVisible = await page
      .locator('input[name="securityAnswer"]')
      .isVisible()
      .catch(() => false)
    expect(questionNotVisible).toBeFalsy()

    console.log('✅ Nonexistent user correctly rejected')
  })

  test('password mismatch shows error', async ({ page }) => {
    // Step 1: Enter username
    await page.fill('input[name="username"]', testUsername)
    await page.click('button[type="submit"]:has-text("下一步")')

    await page.waitForTimeout(2000)

    // Step 2: Enter mismatched passwords
    await page.fill('input[name="securityAnswer"]', securityAnswer)
    await page.fill('input[name="newPassword"]', 'password123')
    await page.fill('input[name="confirmPassword"]', 'different456')

    await page.click('button[type="submit"]:has-text("重置密码")')

    await page.waitForTimeout(500)

    // Should show error
    const errorVisible = await page.locator('text=/两次密码输入不一致/i').isVisible()
    expect(errorVisible).toBeTruthy()

    console.log('✅ Password mismatch validation working')
  })

  test('password length validation', async ({ page }) => {
    // Step 1: Enter username
    await page.fill('input[name="username"]', testUsername)
    await page.click('button[type="submit"]:has-text("下一步")')

    await page.waitForTimeout(2000)

    // Step 2: Enter too short password
    await page.fill('input[name="securityAnswer"]', securityAnswer)
    await page.fill('input[name="newPassword"]', 'short')
    await page.fill('input[name="confirmPassword"]', 'short')

    await page.click('button[type="submit"]:has-text("重置密码")')

    await page.waitForTimeout(500)

    // Should show error
    const errorVisible = await page.locator('text=/密码至少8个字符/i').isVisible()
    expect(errorVisible).toBeTruthy()

    console.log('✅ Password length validation working')
  })

  test('back to login button works', async ({ page }) => {
    // On username step
    const backButton = page.locator('button:has-text("返回登录")')
    await backButton.click()

    // Should navigate to login page
    await page.waitForURL('/login', { timeout: 3000 })

    console.log('✅ Back to login navigation working')
  })
})
