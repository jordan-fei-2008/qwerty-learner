# 前端调用 /api/progress 的完整链路

## 📊 调用链路图

```
用户操作
   ↓
组件层 (*.tsx)
   ↓
Hook 层 (useProgressSync)
   ↓
Service 层 (progressSync.ts)
   ↓
HTTP 层 (http.ts)
   ↓
Backend API (/api/progress)
```

---

## 🔍 详细调用链路

### 1. **入口点：组件层调用**

目前有 3 个地方调用了进度同步：

#### 📝 A. ProgressTest 页面（测试页面）

**文件：** `src/pages/ProgressTest.tsx`

**调用方式：**

```tsx
import { useProgressSync } from '@/hooks/useProgressSync'

const { syncProgress } = useProgressSync()

// 场景1: 添加已掌握单词
const handleAddMasteredWord = () => {
  const updatedProgress: UserProgress = {
    ...progress,
    masteredWords: [...progress.masteredWords, testWord.trim()],
    stats: {
      totalLearned: progress.stats.totalLearned + 1,
      todayLearned: progress.stats.todayLearned + 1,
    },
  }

  setProgress(updatedProgress)
  syncProgress(updatedProgress) // 👈 调用同步
}

// 场景2: 更新连续天数
const handleIncrementStreak = () => {
  const updatedProgress = {
    ...progress,
    stats: { ...progress.stats, streakDays: progress.stats.streakDays + 1 },
  }

  setProgress(updatedProgress)
  syncProgress(updatedProgress) // 👈 调用同步
}
```

**路由：** `/progress-test`

---

#### ☁️ B. SyncNowButton 组件（立即同步按钮）

**文件：** `src/components/SyncNowButton.tsx`

**调用方式：**

```tsx
import { useProgressSync } from '@/hooks/useProgressSync'

const { syncNow, pendingCount, isSyncing } = useProgressSync()

const handleClick = async () => {
  await syncNow() // 👈 立即同步所有待处理的操作
}
```

**使用位置：**

- ProgressTest 页面的右上角
- 其他任何需要手动同步按钮的地方

---

#### 📚 C. useSessionResume Hook（断点续学）

**文件：** `src/hooks/useSessionResume.ts`

**调用方式：**

```tsx
import { useProgressSync } from './useProgressSync'

const { syncProgress } = useProgressSync()

// 场景1: 保存学习断点
const saveSessionPointer = (wordset: string, nextIndex: number) => {
  const updatedProgress = updateSessionPointer(progress, wordset, nextIndex)
  setProgress(updatedProgress)
  syncProgress(updatedProgress) // 👈 立即同步断点
}

// 场景2: 清除断点
const clearSession = () => {
  const updatedProgress = clearSessionPointer(progress)
  setProgress(updatedProgress)
  syncProgress(updatedProgress) // 👈 同步清除操作
}
```

**使用位置：**

- 任何使用 `useSessionResume()` hook 的组件
- 如：学习页面保存进度时

---

### 2. **Hook 层：useProgressSync**

**文件：** `src/hooks/useProgressSync.ts`

```tsx
export function useProgressSync() {
  // ... 初始化代码 ...

  // 方法1: 队列同步（防抖）
  const syncProgress = (update: Partial<UserProgress>) => {
    if (!isAuthenticated) return
    queueProgressUpdate(update) // 👈 调用 Service 层
  }

  // 方法2: 立即同步
  const syncNow = async () => {
    if (!isAuthenticated) return
    await syncNowService() // 👈 调用 Service 层
  }

  return { syncProgress, syncNow, pendingCount, isSyncing }
}
```

**职责：**

- ✅ 检查用户是否已登录
- ✅ 提供统一的同步接口
- ✅ 管理同步状态（pendingCount, isSyncing）
- ✅ 与 Jotai 状态管理集成

---

### 3. **Service 层：progressSync.ts**

**文件：** `src/services/user/progressSync.ts`

#### 核心方法

```tsx
// 方法1: 队列更新（防抖）
export function queueProgressUpdate(update: Partial<UserProgress>) {
  operationBuffer.push(update)
  onBufferChange?.(operationBuffer.length)
  saveOfflineBuffer() // 持久化到 localStorage

  // 条件1: 缓冲区满（10个操作）→ 立即同步
  if (operationBuffer.length >= MAX_BUFFER_SIZE) {
    void flushUpdates() // 👈 发起 HTTP 请求
    return
  }

  // 条件2: 防抖（3秒后同步）
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    void flushUpdates() // 👈 发起 HTTP 请求
  }, DEBOUNCE_MS)
}

// 方法2: 立即同步
export async function syncNow(): Promise<ProgressResponse | null> {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  return flushUpdates() // 👈 发起 HTTP 请求
}

// 方法3: 刷新缓冲区（实际发送 HTTP 请求）
async function flushUpdates(): Promise<ProgressResponse | null> {
  if (isFlushing || operationBuffer.length === 0) return null
  if (!currentToken) return null

  isFlushing = true
  onSyncStart?.()

  try {
    // 合并所有待处理的更新
    const mergedProgress = mergeProgressUpdates(operationBuffer)

    // 发送到后端 👇👇👇
    const response = await http.put<ProgressResponse>(
      '/progress',
      {
        schemaVersion: 1,
        progress: mergedProgress,
      },
      {
        token: currentToken,
      },
    )

    // 清空缓冲区
    operationBuffer = []
    onBufferChange?.(0)
    onSyncSuccess?.(response)
    clearOfflineBuffer()

    return response
  } catch (error) {
    console.error('Failed to sync progress:', error)
    onSyncError?.(error as Error)
    return null
  } finally {
    isFlushing = false
  }
}
```

**职责：**

- ✅ 管理操作缓冲区（operationBuffer）
- ✅ 实现防抖逻辑（3 秒）
- ✅ 实现缓冲区满自动刷新（10 个操作）
- ✅ 离线支持（localStorage 持久化）
- ✅ 合并多个部分更新为一个完整请求
- ✅ 触发回调通知 UI（onSyncStart, onSyncSuccess, onSyncError）

---

### 4. **HTTP 层：http.ts**

**文件：** `src/services/user/http.ts`

```tsx
export const http = {
  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`  // 👈 添加认证 token
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText, ...)
  }

  return response.json()
}
```

**实际请求：**

```http
PUT /api/progress HTTP/1.1
Host: localhost:8080
Content-Type: application/json
Authorization: Bearer eyJhbGc...  👈 JWT Token

{
  "schemaVersion": 1,
  "progress": {
    "masteredWords": ["apple", "banana"],
    "familiarity": {"apple": 5, "banana": 3},
    "reviewQueue": [],
    "stats": {
      "totalLearned": 2,
      "todayLearned": 2,
      "streakDays": 1
    },
    "sessionPointer": null,
    "archived": []
  }
}
```

---

### 5. **Backend 处理**

**文件：** `backend/.../controller/ProgressController.java`

```java
@PutMapping
public ResponseEntity<?> updateProgress(
        @RequestHeader("Authorization") String authHeader,
        @Valid @RequestBody ProgressUpdateRequest request) {

    // 1. 提取并验证 token
    String token = extractToken(authHeader);
    Long userId = tokenUtil.getUserIdFromToken(token);

    if (userId == null) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(Map.of("error", "Invalid or expired token"));
    }

    // 2. 更新进度
    ProgressResponse response = progressService.updateProgress(userId, request);

    // 3. 返回更新后的进度
    return ResponseEntity.ok(response);
}
```

**响应示例：**

```json
{
  "schemaVersion": 1,
  "progress": {
    "masteredWords": ["apple", "banana"],
    "familiarity": {"apple": 5, "banana": 3},
    ...
  },
  "updatedAt": "2025-11-01T10:30:00Z"
}
```

---

## 🎯 实际使用场景

### 场景 1: 用户在测试页面学习单词

```
1. 用户访问 /progress-test
2. 输入单词 "apple" 并点击"添加已掌握单词"
3. ProgressTest.handleAddMasteredWord() 执行
4. 调用 syncProgress({ masteredWords: [..., "apple"], stats: {...} })
5. queueProgressUpdate() 将更新加入缓冲区
6. 3秒后（或10次操作后）自动触发 flushUpdates()
7. http.put('/progress', ...) 发送到后端
8. Backend ProgressController 接收并处理
9. 返回更新后的进度
10. onSyncSuccess 回调更新本地状态
```

### 场景 2: 用户点击"立即同步"按钮

```
1. 用户点击 SyncNowButton
2. 调用 syncNow()
3. 清除防抖定时器
4. 立即执行 flushUpdates()
5. 发送所有待处理的更新到后端
6. UI 显示"同步中..."状态
7. 同步完成后更新 pendingCount 为 0
```

### 场景 3: 保存学习断点

```
1. 用户在学习页面学习到第 42 个单词
2. 组件调用 saveSessionPointer('CET4-chapter3', 42)
3. 更新 progress.sessionPointer
4. 立即调用 syncProgress() 同步到服务器
5. 用户切换设备登录时可以从第 42 个单词继续
```

---

## 📝 总结

### 目前调用 `/api/progress` 的地方：

1. **ProgressTest 页面** (`src/pages/ProgressTest.tsx`)

   - 添加已掌握单词
   - 更新学习统计

2. **SyncNowButton 组件** (`src/components/SyncNowButton.tsx`)

   - 手动立即同步按钮

3. **useSessionResume Hook** (`src/hooks/useSessionResume.ts`)
   - 保存/清除学习断点

### 同步触发时机：

- ⏱️ **防抖同步**：3 秒内无新操作 → 自动同步
- 📊 **缓冲区满**：累积 10 次操作 → 立即同步
- 🔘 **手动触发**：点击"立即同步"按钮 → 立即同步
- 📚 **断点保存**：保存学习进度 → 立即同步

### 核心文件：

- 🎯 **入口**：`src/pages/ProgressTest.tsx`, `src/components/SyncNowButton.tsx`
- 🔗 **Hook**：`src/hooks/useProgressSync.ts`
- ⚙️ **Service**：`src/services/user/progressSync.ts` ← **实际发送请求的地方**
- 🌐 **HTTP**：`src/services/user/http.ts`
- 🖥️ **Backend**：`backend/.../controller/ProgressController.java`
