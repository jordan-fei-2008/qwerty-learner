# Authentication & Route Protection Implementation

## 概述
实现了完整的身份验证和路由保护机制，确保未登录用户无法访问受保护的页面。

## 实现的功能

### 1. ProtectedRoute 组件
**路径**: `src/components/ProtectedRoute.tsx`

**功能**:
- 检查用户是否已登录（token 存在）
- 验证 JWT token 是否过期
- 未登录或 token 过期时重定向到登录页
- 保存用户尝试访问的 URL，登录后自动返回

**Token 过期检查**:
```typescript
function isTokenExpired(token: string): boolean {
  // 解析 JWT payload
  // 检查 exp 字段
  // 添加 10 秒缓冲时间避免时钟偏差
  return Date.now() >= (exp - 10000)
}
```

### 2. 路由配置
**路径**: `src/index.tsx`

**公开路由** (无需登录):
- `/login` - 登录页面
- `/register` - 注册页面
- `/reset-password` - 密码重置页面

**受保护路由** (需要登录):
- `/` - 主页（打字练习）
- `/progress-test` - 进度测试
- `/gallery` - 图库
- `/analysis` - 数据统计
- `/error-book` - 错题本
- `/friend-links` - 友情链接

### 3. HTTP 拦截器
**路径**: `src/services/user/http.ts`

**401 处理**:
```typescript
if (response.status === 401) {
  // 清除本地认证数据
  localStorage.removeItem('authToken')
  localStorage.removeItem('username')
  // 重定向到登录页
  window.location.href = '/login'
}
```

### 4. 登录后重定向
**路径**: `src/pages/Login.tsx`

**功能**:
- 从 `location.state.from` 获取用户原本想访问的页面
- 登录成功后重定向回该页面
- 如果没有来源页面，默认重定向到首页

## 用户体验流程

### 场景 1: 未登录访问受保护页面
```
1. 用户访问 http://localhost:5173/analysis
   ↓
2. ProtectedRoute 检测到未登录
   ↓
3. 重定向到 /login，保存 state: { from: '/analysis' }
   ↓
4. 用户输入账号密码登录
   ↓
5. 登录成功后自动跳转回 /analysis
```

### 场景 2: Token 过期
```
1. 用户已登录，但 token 过期
   ↓
2. ProtectedRoute 检测到 token 过期
   ↓
3. 调用 logout() 清除认证状态
   ↓
4. 重定向到 /login
   ↓
5. 显示提示: "登录已过期，请重新登录"
```

### 场景 3: API 调用返回 401
```
1. 用户在页面中操作，调用后端 API
   ↓
2. 后端返回 401 Unauthorized (token 过期/无效)
   ↓
3. HTTP 拦截器捕获 401 错误
   ↓
4. 自动清除 localStorage 中的认证数据
   ↓
5. 重定向到 /login
   ↓
6. 显示错误提示: "未授权，请重新登录"
```

## 测试步骤

### 测试 1: 未登录访问保护页面

1. **清除登录状态**
   ```javascript
   // 在浏览器 Console 中执行
   localStorage.removeItem('authToken')
   localStorage.removeItem('username')
   location.reload()
   ```

2. **尝试访问受保护页面**
   - 访问 http://localhost:5173/
   - 应该立即重定向到 /login

3. **登录后验证重定向**
   - 输入账号密码登录
   - 应该自动返回到首页 /

### 测试 2: 直接访问特定页面

1. **清除登录状态**（同上）

2. **访问特定受保护页面**
   - 访问 http://localhost:5173/analysis
   - 应该重定向到 /login

3. **登录并验证**
   - 登录成功后应该返回 /analysis（不是首页）

4. **检查 Console 日志**
   ```
   [ProtectedRoute] User not authenticated or token expired, redirecting to login
   [Login] Redirecting to: /analysis
   ```

### 测试 3: Token 过期检测

1. **模拟过期的 Token**
   ```javascript
   // 在浏览器 Console 中
   // 创建一个已过期的 JWT token (exp 设置为过去的时间)
   const expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidXNlcklkIjoxLCJleHAiOjE2MDAwMDAwMDB9.xxx"
   localStorage.setItem('authToken', JSON.stringify(expiredToken))
   location.reload()
   ```

2. **访问受保护页面**
   - 应该检测到 token 过期
   - 自动重定向到 /login

3. **检查 Console 日志**
   ```
   [ProtectedRoute] Token expired, logging out
   [ProtectedRoute] User not authenticated or token expired, redirecting to login
   ```

### 测试 4: API 401 响应处理

1. **正常登录**

2. **手动清除后端 session 或等待 token 自然过期**

3. **执行需要调用 API 的操作**
   - 例如：打字练习完成一个章节
   - 或访问 /analysis 页面

4. **验证行为**
   - API 返回 401
   - 自动清除本地认证数据
   - 重定向到 /login
   - 显示错误提示

5. **检查 Console 日志**
   ```
   [HTTP] 401 Unauthorized - clearing auth and redirecting to login
   ```

### 测试 5: 公开页面访问

1. **未登录状态**

2. **访问公开页面**
   - /login - 应该正常显示
   - /register - 应该正常显示
   - /reset-password - 应该正常显示

3. **验证**
   - 这些页面不应该重定向到登录页
   - 可以正常使用功能

### 测试 6: 已登录用户访问登录页

1. **已登录状态**

2. **手动访问 /login**
   - 应该可以正常访问（用于切换账号）

3. **登录其他账号**
   - 应该替换当前登录状态
   - 重定向到首页

## 安全特性

### 1. Token 验证
- ✅ 检查 token 是否存在
- ✅ 检查 token 格式是否正确（JWT 三段式）
- ✅ 检查 token 是否过期（解析 exp 字段）
- ✅ 添加时钟偏差缓冲（10 秒）

### 2. 自动清理
- ✅ Token 过期时自动清除 localStorage
- ✅ 401 响应时自动清除认证数据
- ✅ 登出时清除所有认证状态

### 3. 防止信息泄露
- ✅ 未登录用户无法访问受保护页面
- ✅ Token 过期后立即阻止访问
- ✅ API 调用失败时不暴露敏感信息

## 已知限制和未来优化

### 当前限制
1. **Token 刷新**: 目前没有实现 token 自动刷新机制
2. **会话保持**: 用户需要在 token 过期后重新登录
3. **多标签同步**: 多个标签页的登录状态不同步

### 未来优化
1. **实现 Refresh Token**:
   - 后端返回 access token + refresh token
   - Access token 短期有效（如 1 小时）
   - Refresh token 长期有效（如 30 天）
   - Token 即将过期时自动刷新

2. **多标签同步**:
   - 使用 localStorage 事件监听
   - 一个标签登出，其他标签同步登出
   - 一个标签登录，其他标签同步更新

3. **记住登录状态**:
   - 添加"记住我"选项
   - 使用更长期的 token
   - 或使用 refresh token 机制

4. **更友好的过期提示**:
   - Token 即将过期时显示续期提示
   - 过期后显示明确的过期原因
   - 提供快速重新登录的入口

## Console 日志说明

### ProtectedRoute 日志
```
[ProtectedRoute] Token expired, logging out
[ProtectedRoute] User not authenticated or token expired, redirecting to login
[ProtectedRoute] Failed to parse token: [error]
```

### HTTP 拦截器日志
```
[HTTP] 401 Unauthorized - clearing auth and redirecting to login
```

### Login 页面日志
```
[Login] Redirecting to: /analysis
[Login] Progress hydrated from server
```

## 代码示例

### 使用 ProtectedRoute 保护新页面
```tsx
// src/index.tsx
<Route
  path="/new-page"
  element={
    <ProtectedRoute>
      <NewPage />
    </ProtectedRoute>
  }
/>
```

### 在组件中检查登录状态
```tsx
import { useAtomValue } from 'jotai'
import { isAuthenticatedAtom, authTokenAtom } from '@/store/authSlice'

function MyComponent() {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom)
  const token = useAtomValue(authTokenAtom)
  
  if (!isAuthenticated) {
    return <div>请先登录</div>
  }
  
  return <div>欢迎回来！</div>
}
```

### 手动触发登出
```tsx
import { useSetAtom } from 'jotai'
import { logoutAtom } from '@/store/authSlice'
import { useNavigate } from 'react-router-dom'

function LogoutButton() {
  const logout = useSetAtom(logoutAtom)
  const navigate = useNavigate()
  
  const handleLogout = () => {
    logout()
    navigate('/login')
  }
  
  return <button onClick={handleLogout}>退出登录</button>
}
```
