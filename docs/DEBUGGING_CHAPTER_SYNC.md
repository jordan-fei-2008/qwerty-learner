# 章节完成同步问题调试指南

## 问题描述
完成章节后，Network 标签中没有看到 `POST /api/progress/patch` 请求。

## 已添加调试日志

我已经在关键位置添加了详细的 Console 日志，帮助您定位问题：

### 1. Typing 页面日志 (`src/pages/Typing/index.tsx`)
```
[Typing] Chapter finished! isReviewMode: false
[Typing] Calling onChapterComplete with: {...}
```

### 2. ChapterCompletion Hook 日志 (`src/hooks/useChapterCompletion.ts`)
```
[ChapterCompletion] ===== START =====
[ChapterCompletion] Chapter result: {...}
[ChapterCompletion] Current progress: {...}
[ChapterCompletion] Built patch: {...}
[ChapterCompletion] Updated progress: {...}
[ChapterCompletion] Patch enqueued to buffer
[ChapterCompletion] Starting sync...
[ChapterCompletion] Sync response: {...}
[ChapterCompletion] Sync successful ✅
[ChapterCompletion] ===== END =====
```

## 调试步骤

### 步骤 1: 刷新页面
1. 保存所有文件
2. 在浏览器中 **强制刷新**: `Ctrl+Shift+R` (Windows/Linux) 或 `Cmd+Shift+R` (Mac)
3. 确保前端代码已重新编译（查看终端输出）

### 步骤 2: 打开 Console 并清空日志
1. 按 `F12` 打开开发者工具
2. 切换到 **Console** 标签
3. 点击清空按钮 🚫 清空所有旧日志
4. 确保日志级别为 "All" 或 "Verbose"

### 步骤 3: 完成一个章节并观察日志

#### 场景 A: 看到 `[Typing] Chapter finished!`
如果您看到这个日志，说明章节完成检测正常。

**检查 isReviewMode 值**:
- 如果显示 `isReviewMode: true`，说明您在复习模式，**不会触发同步**
- 如果显示 `isReviewMode: false`，应该会继续执行

**预期后续日志**:
```
[Typing] Calling onChapterComplete with: {wordsetId: "cet4-0", words: [...], ...}
[ChapterCompletion] ===== START =====
[ChapterCompletion] Chapter result: {...}
...
```

#### 场景 B: 没有看到任何 `[Typing]` 日志
**可能原因**:
1. **代码没有重新编译** - 查看终端是否有编译错误
2. **章节没有真正完成** - 检查 `state.isFinished` 状态
3. **正在保存记录** - `state.isSavingRecord` 为 true

**解决方法**:
```javascript
// 在 Console 中手动检查状态
const typingState = document.querySelector('[data-typing-state]')
console.log('Typing state:', typingState)
```

#### 场景 C: 看到 `[ChapterCompletion] ===== START =====` 但中断
如果日志在某个步骤停止，说明该步骤出错。

**检查每个步骤**:

1. **如果停在 "Built patch"**:
   - `buildChapterPatch` 函数出错
   - 检查 `chapterResult` 数据格式

2. **如果停在 "Updated progress"**:
   - `applyPatchToLocalProgress` 函数出错
   - 检查 `progress` 和 `patch` 数据

3. **如果停在 "Starting sync..."**:
   - Network 请求前出错
   - 检查 `patchProgress` 函数

4. **如果没有 "Sync response" 或 "Sync successful"**:
   - Network 请求失败
   - 打开 **Network** 标签查看请求详情

### 步骤 4: 检查 Network 标签

1. 切换到 **Network** 标签
2. 勾选 **Preserve log**（保留日志）
3. 筛选 `progress` 或 `patch`
4. 完成章节后查看请求列表

**如果看到请求**:
- ✅ 请求存在 - 点击查看 Status、Payload、Response
- ❌ 请求失败 - 查看错误信息（401/400/500 等）

**如果没有看到请求**:
- 说明 `patchProgress()` 函数根本没被调用
- 返回 Console 查看是否有错误日志

### 步骤 5: 手动检查进度状态

在 Console 中执行：

```javascript
// 检查 progressAtom 的值
console.log('Progress atom value:', 
  JSON.parse(localStorage.getItem('progress_state') || 'null')
)

// 检查是否登录
console.log('Auth token:', 
  JSON.parse(localStorage.getItem('authToken') || 'null')
)

// 检查离线缓冲区
console.log('Offline buffer:', 
  JSON.parse(localStorage.getItem('progress_patch_buffer_v1') || '[]')
)
```

## 常见问题诊断

### 问题 1: "progress is null"
**原因**: 用户未登录或登录后未获取进度

**解决**:
1. 确认已登录（检查 `authToken` 在 localStorage 中）
2. 登录后应该调用 `getProgress()` 获取初始进度
3. 检查 `Login.tsx` 中的 `proceedWithLogin` 函数

**临时修复**: 手动初始化进度
```javascript
localStorage.setItem('progress_state', JSON.stringify({
  masteredWords: [],
  familiarity: {},
  reviewQueue: [],
  stats: {
    totalLearned: 0,
    daysStudied: 0,
    currentStreak: 0,
    lastStudyDate: null
  },
  sessionPointer: null
}))
```

### 问题 2: "Sync failed: 401 Unauthorized"
**原因**: Token 无效或过期

**解决**:
1. 重新登录
2. 检查 `getAuthToken()` 函数是否正确读取 token
3. 确认 Authorization header 格式正确

### 问题 3: "Sync failed: 404 Not Found"
**原因**: 
- 后端服务未启动
- 用户进度记录不存在

**解决**:
1. 确认后端运行: `curl http://localhost:8080/api/progress`
2. 检查用户是否有初始进度记录
3. 如果是新用户，确保注册时创建了初始进度

### 问题 4: "buildChapterPatch is not a function"
**原因**: 导入路径错误或函数未导出

**解决**:
1. 检查 `src/services/progress/patchBuilder.ts` 文件存在
2. 确认函数有 `export` 关键字
3. 重新启动开发服务器

## 快速测试脚本

在 Console 中粘贴并运行，快速诊断：

```javascript
// === 完整诊断脚本 ===
console.log('=== 学习进度同步诊断 ===\n')

// 1. 检查登录状态
const authToken = localStorage.getItem('authToken')
console.log('1. 登录状态:', authToken ? '✅ 已登录' : '❌ 未登录')
if (authToken) {
  try {
    const token = JSON.parse(authToken)
    console.log('   Token 长度:', token.length)
  } catch (e) {
    console.log('   Token 格式:', authToken.substring(0, 20) + '...')
  }
}

// 2. 检查进度数据
const progressKeys = ['progress_state', 'userProgress', 'progress_state_v1']
let foundProgress = false
for (const key of progressKeys) {
  const data = localStorage.getItem(key)
  if (data) {
    try {
      const progress = JSON.parse(data)
      console.log(`2. 进度数据 (${key}):`, progress ? '✅ 存在' : '❌ 不存在')
      if (progress) {
        console.log('   已掌握单词:', progress.masteredWords?.length || 0)
        console.log('   复习队列:', progress.reviewQueue?.length || 0)
        foundProgress = true
        break
      }
    } catch (e) {
      console.log(`   ${key} 解析失败`)
    }
  }
}
if (!foundProgress) {
  console.log('2. 进度数据: ❌ 未找到')
}

// 3. 检查离线缓冲区
const buffer = localStorage.getItem('progress_patch_buffer_v1')
if (buffer) {
  try {
    const patches = JSON.parse(buffer)
    console.log('3. 离线缓冲区: ✅ 存在')
    console.log('   待同步章节:', patches.length)
  } catch (e) {
    console.log('3. 离线缓冲区: ❌ 损坏')
  }
} else {
  console.log('3. 离线缓冲区: ⚪ 为空（正常）')
}

// 4. 检查后端连接
console.log('4. 后端连接: 测试中...')
fetch('/api/progress', {
  headers: {
    'Authorization': `Bearer ${authToken ? JSON.parse(authToken) : 'no-token'}`
  }
})
  .then(r => {
    console.log('   后端状态:', r.status === 200 ? '✅ 正常' : `⚠️ ${r.status} ${r.statusText}`)
    return r.json()
  })
  .then(data => console.log('   进度数据:', data))
  .catch(e => console.error('   ❌ 连接失败:', e.message))

console.log('\n=== 诊断完成 ===')
console.log('提示: 完成一个章节后查看上方日志')
```

## 预期的完整日志流程

完成一个章节后，Console 应该显示：

```
[Typing] Chapter finished! isReviewMode: false
[Typing] Calling onChapterComplete with: {wordsetId: "cet4-0", words: Array(20), ...}
[ChapterCompletion] ===== START =====
[ChapterCompletion] Chapter result: {wordsetId: "cet4-0", words: Array(20), nextPointer: {...}}
[ChapterCompletion] Current progress: {masteredWords: Array(0), familiarity: {}, ...} 或 null
[ChapterCompletion] Built patch: {masteredWords: Array(18), familiarity: {...}, stats: {...}, ...}
[ChapterCompletion] Updated progress: {masteredWords: Array(18), familiarity: {...}, ...}
[ChapterCompletion] Patch enqueued to buffer
[ChapterCompletion] Starting sync...
[ChapterCompletion] Sync response: {schemaVersion: 1, progress: {...}, updatedAt: "2025-11-01..."}
[ChapterCompletion] Sync successful ✅
[ChapterCompletion] ===== END =====
```

Network 标签应该显示：
```
POST /api/progress/patch    200 OK    [timing]
```

## 下一步

1. **刷新页面**后重新测试
2. 在 Console 中运行诊断脚本
3. 完成一个章节
4. 截图 Console 和 Network 标签
5. 根据日志定位问题

如果问题仍然存在，请提供：
- Console 的完整日志截图
- Network 标签的截图（包括请求列表）
- 诊断脚本的输出

这样我可以帮您精确定位问题！
