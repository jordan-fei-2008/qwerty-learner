# 登录跳转问题修复

## 问题描述
登录成功后页面没有跳转到主页，仍然停留在登录页面。

## 根本原因
1. `proceedWithLogin` 函数中调用了 `getProgress()` API，但此时 token 刚通过 `setAuthData` 设置到 Jotai atom，`atomWithStorage` 还未将 token 持久化到 localStorage
2. `getAuthToken()` 从 localStorage 读取时获取不到新的 token，导致 API 调用失败
3. 错误被 catch 捕获但没有正确处理，导致导航逻辑被跳过

## 修复方案

### 1. 简化登录流程
移除了不必要的 `getProgress()` API 调用：
```typescript
// 之前：登录后再次调用 API 获取进度
const cloudProgress = await getProgress()
setProgress(cloudProgress)

// 现在：直接使用登录响应中的进度数据
setProgress(response.progress)
```

**理由**: `AuthResponse` 已经包含完整的 `progress` 数据，无需重复获取。

### 2. 改进错误处理
```typescript
// handleSubmit 中 await proceedWithLogin
await proceedWithLogin(response)

// proceedWithLogin 中统一的 try-catch-finally
try {
  // 登录逻辑
} catch (error) {
  throw error // 重新抛出让 handleSubmit 处理
} finally {
  setIsSubmitting(false) // 确保总是重置 loading 状态
}
```

### 3. 添加详细日志
```typescript
console.log('[Login] Starting login process...', response)
console.log('[Login] Auth data saved to atoms')
console.log('[Login] Progress set from login response')
console.log('[Login] Redirecting to:', from)
console.log('[Login] Navigation completed')
```

### 4. 添加小延迟确保状态更新
```typescript
// 等待 50ms 确保 React 状态更新完成
await new Promise(resolve => setTimeout(resolve, 50))
navigate(from, { replace: true })
```

### 5. 修复 Warning 流程
确保离线操作警告对话框的"继续"按钮也能正确处理：
```typescript
const handleWarningProceed = async () => {
  if (pendingLoginData) {
    try {
      await proceedWithLogin(pendingLoginData)
      setPendingLoginData(null)
      setShowWarning(false)
    } catch (error) {
      setErrors({ general: '登录失败，请重试' })
    }
  }
}
```

## 测试步骤

1. **清除登录状态**
   ```javascript
   localStorage.clear()
   location.reload()
   ```

2. **测试登录跳转**
   - 访问 http://localhost:5173/login
   - 输入账号密码点击登录
   - 应该看到 Console 日志：
     ```
     [Login] Starting login process...
     [Login] Auth data saved to atoms
     [Login] Progress set from login response
     [Login] Redirecting to: /
     [Login] Navigation completed
     ```
   - 页面应该成功跳转到首页

3. **测试从受保护页面重定向回来**
   - 清除登录状态
   - 访问 http://localhost:5173/analysis
   - 应该重定向到 /login
   - 登录后应该返回 /analysis（不是首页）

4. **测试离线操作警告流程**
   - 如果有离线操作缓冲
   - 登录时显示警告对话框
   - 点击"继续"应该正确登录并跳转

## 代码变更摘要

**src/pages/Login.tsx**:
- ✅ 移除 `import { getProgress } from '@/services/progress/api'`
- ✅ 简化 `proceedWithLogin`：直接使用 `response.progress`
- ✅ 改进错误处理：统一的 try-catch-finally
- ✅ 添加详细的 Console 日志
- ✅ 添加 50ms 延迟确保状态更新
- ✅ 修复 `handleWarningProceed` 为 async 函数

## 预期结果
- ✅ 登录成功后立即跳转到目标页面
- ✅ 无需重复 API 调用（减少网络请求）
- ✅ 更清晰的错误处理和日志
- ✅ 更好的用户体验（更快的登录流程）
