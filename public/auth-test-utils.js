/**
 * Authentication Test Utilities
 * 在浏览器 Console 中使用这些函数来测试身份验证功能
 */

// 测试 1: 清除登录状态
window.testClearAuth = function () {
  console.log('🧹 清除认证状态...')
  localStorage.removeItem('authToken')
  localStorage.removeItem('username')
  console.log('✅ 认证状态已清除')
  console.log('💡 刷新页面查看效果: location.reload()')
}

// 测试 2: 检查当前登录状态
window.testCheckAuth = function () {
  const token = localStorage.getItem('authToken')
  const username = localStorage.getItem('username')

  console.log('🔍 当前认证状态:')
  console.log('Token:', token ? '存在' : '不存在')
  console.log('Username:', username)

  if (token) {
    try {
      const parsed = JSON.parse(token)
      const parts = parsed.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]))
        const exp = new Date(payload.exp * 1000)
        const now = new Date()
        console.log('Token 过期时间:', exp.toLocaleString())
        console.log('当前时间:', now.toLocaleString())
        console.log('Token 状态:', now < exp ? '✅ 有效' : '❌ 已过期')
      }
    } catch (e) {
      console.log('⚠️ Token 解析失败:', e.message)
    }
  }
}

// 测试 3: 模拟过期的 Token
window.testExpiredToken = function () {
  console.log('⏰ 设置过期的 Token...')
  // 创建一个已过期的 JWT token (exp 为 2020 年)
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(
    JSON.stringify({
      sub: '1234567890',
      userId: 1,
      exp: 1600000000, // 2020-09-13
    }),
  )
  const signature = 'expired-signature'
  const expiredToken = `${header}.${payload}.${signature}`

  localStorage.setItem('authToken', JSON.stringify(expiredToken))
  console.log('✅ 已设置过期 Token')
  console.log('💡 刷新页面查看效果: location.reload()')
}

// 测试 4: 测试受保护路由
window.testProtectedRoutes = function () {
  const routes = ['/', '/analysis', '/error-book', '/gallery', '/progress-test', '/friend-links']

  console.log('🛡️ 受保护的路由列表:')
  routes.forEach((route) => console.log(`  - ${route}`))
  console.log('\n💡 使用 testClearAuth() 清除登录状态后访问这些路由，应该重定向到 /login')
}

// 测试 5: 测试公开路由
window.testPublicRoutes = function () {
  const routes = ['/login', '/register', '/reset-password']

  console.log('🌐 公开路由列表:')
  routes.forEach((route) => console.log(`  - ${route}`))
  console.log('\n💡 这些路由无需登录即可访问')
}

// 测试 6: 完整测试流程
window.testFullFlow = async function () {
  console.log('🚀 开始完整测试流程...\n')

  console.log('步骤 1/5: 检查当前状态')
  window.testCheckAuth()

  console.log('\n步骤 2/5: 清除认证状态')
  window.testClearAuth()

  console.log('\n步骤 3/5: 5秒后尝试访问受保护页面...')
  await new Promise((resolve) => setTimeout(resolve, 5000))

  console.log('步骤 4/5: 访问 /analysis')
  window.location.href = '/analysis'

  console.log('步骤 5/5: 应该重定向到 /login')
}

// 打印帮助信息
console.log(`
╔════════════════════════════════════════════════════════════╗
║         🔐 Authentication Test Utilities 已加载            ║
╠════════════════════════════════════════════════════════════╣
║ 可用的测试函数:                                             ║
║                                                             ║
║ testClearAuth()        - 清除登录状态                       ║
║ testCheckAuth()        - 检查当前登录状态                   ║
║ testExpiredToken()     - 设置过期的 Token                   ║
║ testProtectedRoutes()  - 查看受保护的路由                   ║
║ testPublicRoutes()     - 查看公开路由                       ║
║ testFullFlow()         - 运行完整测试流程                   ║
║                                                             ║
║ 示例:                                                       ║
║   > testCheckAuth()    // 查看当前状态                      ║
║   > testClearAuth()    // 清除登录                          ║
║   > location.reload()  // 刷新页面                          ║
╚════════════════════════════════════════════════════════════╝
`)
