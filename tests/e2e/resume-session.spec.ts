import { test, expect } from '@playwright/test'

test.describe('Session Resume - Cross-Device Learning Continuity', () => {
  const testUsername = 'testuser3'
  const testPassword = 'testpass123'

  test('T061: resume next word after device switch', async ({ browser }) => {
    // Device 1: Login and set session pointer
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()

    // Login on device 1
    await page1.goto('/login')
    await page1.fill('input[name="username"]', testUsername)
    await page1.fill('input[name="password"]', testPassword)
    await page1.click('button[type="submit"]')
    await page1.waitForURL('/', { timeout: 5000 })

    // Navigate to progress test page
    await page1.goto('/progress-test')
    await page1.waitForTimeout(1000)

    // Simulate setting a session pointer
    // In real usage, this would be set during actual learning
    // For testing, we'll directly update localStorage
    const testWordset = 'CET4_T'
    const testNextIndex = 42

    await page1.evaluate(
      ({ wordset, index }) => {
        const progressStr = localStorage.getItem('userProgress')
        if (progressStr) {
          const progress = JSON.parse(progressStr)
          progress.sessionPointer = {
            wordset: wordset,
            nextIndex: index,
          }
          localStorage.setItem('userProgress', JSON.stringify(progress))
        }
      },
      { wordset: testWordset, index: testNextIndex },
    )

    console.log(`Device 1: Set session pointer - ${testWordset}, index ${testNextIndex}`)

    // Trigger sync to save session pointer to server
    const syncButton = page1.locator('button:has-text("立即同步")')
    
    // Add a test word to create a sync operation
    await page1.fill('input[placeholder="输入要添加的单词"]', 'session_test')
    await page1.click('button:has-text("添加掌握的单词")')
    await page1.waitForTimeout(500)
    
    // Click sync button to immediately sync
    await syncButton.click()

    // Wait for sync to complete
    await page1.waitForTimeout(3000)

    console.log('Device 1: Session pointer synced to server')

    // Close device 1
    await context1.close()

    // Device 2: Login with same account and verify session pointer restored
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()

    await page2.goto('/login')
    await page2.fill('input[name="username"]', testUsername)
    await page2.fill('input[name="password"]', testPassword)
    await page2.click('button[type="submit"]')
    await page2.waitForURL('/', { timeout: 5000 })

    console.log('Device 2: Logged in')

    // Check localStorage for session pointer
    const sessionPointer = await page2.evaluate(() => {
      const progressStr = localStorage.getItem('userProgress')
      if (progressStr) {
        const progress = JSON.parse(progressStr)
        return progress.sessionPointer
      }
      return null
    })

    console.log('Device 2: Retrieved session pointer:', sessionPointer)

    // Verify session pointer is restored
    expect(sessionPointer).not.toBeNull()
    expect(sessionPointer.wordset).toBe(testWordset)
    expect(sessionPointer.nextIndex).toBe(testNextIndex)

    console.log('✅ Session pointer successfully restored on device 2')

    await context2.close()
  })

  test('session pointer persists through logout and login', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[name="username"]', testUsername)
    await page.fill('input[name="password"]', testPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/', { timeout: 5000 })

    await page.goto('/progress-test')
    await page.waitForTimeout(1000)

    // Set session pointer
    const wordset1 = 'test_wordset_1'
    const index1 = 10

    await page.evaluate(
      ({ wordset, index }) => {
        const progressStr = localStorage.getItem('userProgress')
        if (progressStr) {
          const progress = JSON.parse(progressStr)
          progress.sessionPointer = { wordset, nextIndex: index }
          localStorage.setItem('userProgress', JSON.stringify(progress))
        }
      },
      { wordset: wordset1, index: index1 },
    )

    // Sync
    await page.fill('input[placeholder="输入要添加的单词"]', 'persist_test')
    await page.click('button:has-text("添加掌握的单词")')
    await page.waitForTimeout(500)
    await page.click('button:has-text("立即同步")')
    await page.waitForTimeout(3000)

    console.log('Session pointer synced')

    // Logout (clear localStorage)
    await page.evaluate(() => localStorage.clear())
    console.log('Logged out (localStorage cleared)')

    // Login again
    await page.goto('/login')
    await page.fill('input[name="username"]', testUsername)
    await page.fill('input[name="password"]', testPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/', { timeout: 5000 })

    // Verify session pointer restored
    const sessionPointer = await page.evaluate(() => {
      const progressStr = localStorage.getItem('userProgress')
      if (progressStr) {
        const progress = JSON.parse(progressStr)
        return progress.sessionPointer
      }
      return null
    })

    expect(sessionPointer).not.toBeNull()
    expect(sessionPointer.wordset).toBe(wordset1)
    expect(sessionPointer.nextIndex).toBe(index1)

    console.log('✅ Session pointer persisted through logout/login')
  })

  test('null session pointer is handled correctly', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[name="username"]', testUsername)
    await page.fill('input[name="password"]', testPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/', { timeout: 5000 })

    await page.goto('/progress-test')
    await page.waitForTimeout(1000)

    // Clear session pointer (set to null)
    await page.evaluate(() => {
      const progressStr = localStorage.getItem('userProgress')
      if (progressStr) {
        const progress = JSON.parse(progressStr)
        progress.sessionPointer = null
        localStorage.setItem('userProgress', JSON.stringify(progress))
      }
    })

    // Sync
    await page.fill('input[placeholder="输入要添加的单词"]', 'null_test')
    await page.click('button:has-text("添加掌握的单词")')
    await page.waitForTimeout(500)
    await page.click('button:has-text("立即同步")')
    await page.waitForTimeout(3000)

    console.log('Null session pointer synced')

    // Reload page
    await page.reload()
    await page.waitForTimeout(1000)

    // Verify session pointer is still null (not causing errors)
    const sessionPointer = await page.evaluate(() => {
      const progressStr = localStorage.getItem('userProgress')
      if (progressStr) {
        const progress = JSON.parse(progressStr)
        return progress.sessionPointer
      }
      return undefined
    })

    expect(sessionPointer).toBeNull()

    console.log('✅ Null session pointer handled correctly')
  })
})
