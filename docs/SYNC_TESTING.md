# 云端同步功能测试指南

## 同步触发机制

### 自动同步触发条件

云端同步会在以下情况**自动触发**：

#### 1. **防抖同步（3 秒延迟）**

- 当用户进行学习活动时，调用 `syncProgress()` 更新进度
- 系统会将更新放入缓冲区
- **3 秒内没有新的更新**，自动同步到云端

```typescript
// 示例：在学习组件中
const { syncProgress } = useProgressSync()

// 用户完成一个单词的学习
syncProgress({
  familiarity: { word1: 5 },
  stats: { totalLearned: 1, todayLearned: 1 },
})
// 👆 3秒后自动同步
```

#### 2. **缓冲区满（10 次操作）**

- 当缓冲区累积了 **10 次未同步的操作**
- 立即强制同步，无需等待防抖时间

```typescript
// 快速学习多个单词
for (let i = 0; i < 10; i++) {
  syncProgress({ familiarity: { [`word${i}`]: 5 } })
}
// 👆 第10次操作时立即同步
```

### 手动同步

#### 3. **立即同步按钮**

- 用户点击"立即同步"按钮
- 使用 `SyncNowButton` 组件或调用 `syncNow()`

```typescript
const { syncNow } = useProgressSync()

// 点击按钮触发
<button onClick={syncNow}>立即同步</button>
```

#### 4. **断点续学保存**

- 用户保存学习断点时
- 调用 `saveSessionPointer()` 会触发立即同步

```typescript
const { saveSessionPointer } = useSessionResume()

// 保存断点
saveSessionPointer('CET4-chapter3', 42)
// 👆 立即同步到云端
```

## 测试场景

### 场景 1: 登录后查看初始进度

**步骤：**

1. 启动后端服务：`cd backend && ./gradlew bootRun`
2. 启动前端服务：`pnpm dev`
3. 访问 http://localhost:5173
4. 使用已有账号登录（如 `testuser3` / `testpass123`）

**预期结果：**

- 登录成功后，从服务器加载用户进度
- Console 显示：`[Login] Progress loaded from server`
- 进度数据显示在页面上

---

### 场景 2: 模拟学习更新（防抖同步）

**步骤：**

1. 登录成功后，打开浏览器开发者工具
2. 在 Console 中执行以下代码模拟学习：

```javascript
// 获取 syncProgress 函数（需要在使用了 useProgressSync 的组件中）
// 或者直接导入
import { queueProgressUpdate } from '@/services/user/progressSync'

// 模拟学习一个单词
queueProgressUpdate({
  familiarity: { apple: 3 },
  stats: { totalLearned: 1, todayLearned: 1 },
})
```

3. 等待 3 秒

**预期结果：**

- 缓冲区显示 `pendingCount: 1`
- 3 秒后自动发起 `PUT /api/progress` 请求
- Network 面板显示请求成功（200 OK）
- `pendingCount` 变为 0
- Console 显示：`[Sync] Progress synced successfully`

---

### 场景 3: 快速操作（缓冲区满）

**步骤：**

1. 在 Console 中快速执行 10 次更新：

```javascript
// 快速学习10个单词
for (let i = 0; i < 10; i++) {
  queueProgressUpdate({
    familiarity: { [`word${i}`]: 5 },
  })
}
```

**预期结果：**

- `pendingCount` 快速增加：1, 2, 3, ..., 10
- 第 10 次时**立即触发同步**（不等待 3 秒）
- Network 面板显示 `PUT /api/progress` 请求
- 同步后 `pendingCount` 变为 0

---

### 场景 4: 手动立即同步

**步骤：**

1. 制造一些未同步的更新：

```javascript
queueProgressUpdate({ familiarity: { test: 2 } })
```

2. 不等待 3 秒，立即点击"立即同步"按钮或执行：

```javascript
import { syncNow } from '@/services/user/progressSync'

await syncNow()
```

**预期结果：**

- 立即触发同步，不等待防抖时间
- Network 面板显示请求
- 同步后 `pendingCount` 变为 0

---

### 场景 5: 断点续学同步

**步骤：**

1. 使用 `useSessionResume` hook：

```javascript
// 在组件中
const { saveSessionPointer } = useSessionResume()

// 保存学习断点
saveSessionPointer('CET4-chapter3', 42)
```

**预期结果：**

- `sessionPointer` 更新为 `{ wordset: 'CET4-chapter3', nextIndex: 42 }`
- **立即触发同步**（不等待 3 秒）
- Network 面板显示 `PUT /api/progress` 请求
- 服务器进度包含 `sessionPointer` 字段

---

### 场景 6: 跨设备同步验证

**步骤：**

1. 在设备 A（浏览器窗口 1）登录
2. 进行一些学习操作并同步
3. 在设备 B（浏览器窗口 2）登录相同账号

**预期结果：**

- 设备 B 登录后自动加载设备 A 的最新进度
- 两个设备的进度数据一致

---

### 场景 7: 离线缓冲

**步骤：**

1. 登录后，在 Network 面板切换到 "Offline" 模式
2. 进行一些学习操作：

```javascript
queueProgressUpdate({ familiarity: { offline: 5 } })
```

3. 切换回 "Online" 模式
4. 点击"立即同步"

**预期结果：**

- 离线时更新保存在 localStorage（key: `qwerty_offline_progress_buffer`）
- `pendingCount` 显示未同步数量
- 恢复在线后同步成功
- localStorage 中的缓冲被清除

---

## 关键 API 端点

### PUT /api/progress

**触发时机：**

- 防抖 3 秒后
- 缓冲区满 10 个操作
- 手动点击"立即同步"
- 保存断点续学

**请求示例：**

```bash
curl -X PUT http://localhost:8080/api/progress \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
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
      "sessionPointer": {
        "wordset": "CET4-chapter3",
        "nextIndex": 42
      },
      "archived": []
    }
  }'
```

**响应示例：**

```json
{
  "schemaVersion": 1,
  "progress": { ... },
  "updatedAt": "2025-11-01T10:30:00Z"
}
```

---

## 调试技巧

### 1. 查看缓冲区状态

```javascript
import { getPendingCount, isSyncing } from '@/services/user/progressSync'

console.log('待同步操作数:', getPendingCount())
console.log('正在同步:', isSyncing())
```

### 2. 查看离线缓冲

```javascript
const buffer = localStorage.getItem('qwerty_offline_progress_buffer')
console.log('离线缓冲:', JSON.parse(buffer || '[]'))
```

### 3. 监听同步事件

```javascript
import { setSyncCallbacks } from '@/services/user/progressSync'

setSyncCallbacks({
  onSyncStart: () => console.log('🔄 开始同步...'),
  onSyncSuccess: (res) => console.log('✅ 同步成功:', res),
  onSyncError: (err) => console.error('❌ 同步失败:', err),
  onBufferChange: (count) => console.log('📊 缓冲区:', count),
})
```

---

## 常见问题

### Q: 为什么我的更新没有立即同步？

A: 默认有 3 秒防抖延迟，这是为了避免频繁请求。可以：

- 等待 3 秒自动同步
- 点击"立即同步"按钮
- 继续操作直到缓冲区满（10 次）

### Q: 如何验证同步成功？

A: 检查以下几点：

1. Network 面板显示 `PUT /api/progress` 请求返回 200
2. `pendingCount` 变为 0
3. Console 显示同步成功日志
4. 在另一个浏览器窗口登录，看到最新进度

### Q: 离线时的操作会丢失吗？

A: 不会。离线操作会：

1. 保存在 localStorage
2. 页面刷新后仍然保留
3. 恢复在线后自动同步

### Q: 登录后如何查看当前进度？

A: 使用 Redux DevTools 或：

```javascript
import { store } from '@/store'

console.log('当前进度:', store.getState().auth.progress)
```
