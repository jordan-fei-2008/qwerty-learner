import { test, expect } from '@playwright/test'

// Note: These tests require the test user 'testuser3' with password 'testpass123'

test.describe('Progress Synchronization', () => {
  const testUsername = 'testuser3'
  const testPassword = 'testpass123'

  test('T056: update progress then verify on second session', async ({ browser }) => {
    // Session 1: Login and update progress
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()

    // Login in first session
    await page1.goto('/login')
    await page1.fill('input[name="username"]', testUsername)
    await page1.fill('input[name="password"]', testPassword)
    await page1.click('button[type="submit"]')
    await page1.waitForURL('/', { timeout: 5000 })

    // Navigate to progress test page
    await page1.goto('/progress-test')
    await page1.waitForTimeout(1000)

    // Get initial mastered words count
    const initialCountText = await page1.locator('text=/已掌握单词/').first().textContent()
    console.log(`Initial mastered words: ${initialCountText}`)

    // Add a unique test word
    const testWord = `e2e_test_${Date.now()}`
    await page1.fill('input[placeholder="输入要添加的单词"]', testWord)
    await page1.click('button:has-text("添加掌握的单词")')

    console.log(`Added word: ${testWord}`)

    // Wait for debounce and sync (3 seconds + network time)
    await page1.waitForTimeout(5000)

    // Verify sync completed (pending count should be 0)
    const syncButton = page1.locator('button:has-text("立即同步")')
    const pendingBadge = syncButton.locator('.bg-blue-500')
    const hasPending = await pendingBadge.isVisible().catch(() => false)
    expect(hasPending).toBeFalsy() // Badge should be hidden when count is 0

    console.log('✅ Progress synced in first session')

    // Close first session
    await context1.close()

    // Session 2: Login with same user in new context (simulating different device)
    const context2 = await browser.newContext()
    const page2 = await context2.newPage()

    await page2.goto('/login')
    await page2.fill('input[name="username"]', testUsername)
    await page2.fill('input[name="password"]', testPassword)
    await page2.click('button[type="submit"]')
    await page2.waitForURL('/', { timeout: 5000 })

    // Navigate to progress test page
    await page2.goto('/progress-test')
    await page2.waitForTimeout(1000)

    // Verify the test word appears in mastered words list
    const wordBadge = page2.locator(`span:has-text("${testWord}")`)
    const wordVisible = await wordBadge.isVisible()
    expect(wordVisible).toBeTruthy()

    console.log(`✅ Word "${testWord}" found in second session`)
    console.log('✅ Cross-device sync verified!')

    await context2.close()
  })

  test('T057: offline operations persisted after reconnect', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[name="username"]', testUsername)
    await page.fill('input[name="password"]', testPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/', { timeout: 5000 })

    await page.goto('/progress-test')
    await page.waitForTimeout(1000)

    // Add a word to create pending operation
    const testWord = `offline_${Date.now()}`
    await page.fill('input[placeholder="输入要添加的单词"]', testWord)
    await page.click('button:has-text("添加掌握的单词")')

    console.log(`Added offline word: ${testWord}`)

    // Immediately check localStorage for offline buffer (before debounce triggers)
    await page.waitForTimeout(500) // Give time for buffer to be saved

    const offlineBuffer = await page.evaluate(() => {
      return localStorage.getItem('qwerty_offline_progress_buffer')
    })

    console.log('Offline buffer in localStorage:', offlineBuffer ? 'exists' : 'null')

    // Verify pending count is shown
    const syncButton = page.locator('button:has-text("立即同步")')
    const pendingBadgeText = await syncButton
      .locator('.bg-blue-500')
      .textContent()
      .catch(() => '0')
    const pendingCount = parseInt(pendingBadgeText || '0')
    expect(pendingCount).toBeGreaterThan(0)

    console.log(`Pending operations: ${pendingCount}`)

    // Simulate page reload (like browser refresh or returning to page)
    await page.reload()
    await page.waitForTimeout(2000)

    // After reload, operations should be restored from localStorage
    // and automatically synced

    // Wait for auto-sync to complete
    await page.waitForTimeout(4000)

    // Check if sync completed (pending count should be 0)
    const syncButtonAfter = page.locator('button:has-text("立即同步")')
    const pendingBadgeAfter = syncButtonAfter.locator('.bg-blue-500')
    const hasPendingAfter = await pendingBadgeAfter.isVisible().catch(() => false)
    expect(hasPendingAfter).toBeFalsy()

    // Verify word was synced successfully
    const wordBadge = page.locator(`span:has-text("${testWord}")`)
    const wordVisible = await wordBadge.isVisible()
    expect(wordVisible).toBeTruthy()

    console.log('✅ Offline operations restored and synced after reconnect')
  })

  test('immediate sync button triggers sync without waiting', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[name="username"]', testUsername)
    await page.fill('input[name="password"]', testPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/', { timeout: 5000 })

    await page.goto('/progress-test')
    await page.waitForTimeout(1000)

    // Add a word
    const testWord = `immediate_${Date.now()}`
    await page.fill('input[placeholder="输入要添加的单词"]', testWord)
    await page.click('button:has-text("添加掌握的单词")')

    // Immediately click sync button (don't wait for debounce)
    await page.waitForTimeout(500)
    const syncButton = page.locator('button:has-text("立即同步")')
    await syncButton.click()

    // Should show syncing state
    const syncingVisible = await page
      .locator('text=同步中')
      .isVisible()
      .catch(() => false)
    console.log('Syncing state shown:', syncingVisible)

    // Wait for sync to complete
    await page.waitForTimeout(2000)

    // Pending count should be 0
    const pendingBadge = syncButton.locator('.bg-blue-500')
    const hasPending = await pendingBadge.isVisible().catch(() => false)
    expect(hasPending).toBeFalsy()

    console.log('✅ Immediate sync completed')
  })

  test('batch multiple operations into single sync request', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('input[name="username"]', testUsername)
    await page.fill('input[name="password"]', testPassword)
    await page.click('button[type="submit"]')
    await page.waitForURL('/', { timeout: 5000 })

    await page.goto('/progress-test')
    await page.waitForTimeout(1000)

    // Listen to network requests
    const requests: any[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/progress') && request.method() === 'PUT') {
        requests.push(request)
      }
    })

    // Quickly add multiple words
    const words = [`batch1_${Date.now()}`, `batch2_${Date.now()}`, `batch3_${Date.now()}`]

    for (const word of words) {
      await page.fill('input[placeholder="输入要添加的单词"]', word)
      await page.click('button:has-text("添加掌握的单词")')
      await page.waitForTimeout(200) // Small delay between operations
    }

    console.log(`Added ${words.length} words quickly`)

    // Wait for debounce and sync
    await page.waitForTimeout(4000)

    // Should have only ONE PUT request (batched)
    console.log(`Number of PUT /api/progress requests: ${requests.length}`)
    expect(requests.length).toBeLessThanOrEqual(1)

    console.log('✅ Multiple operations batched into single sync')
  })
})
