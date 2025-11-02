# 学习进度功能手动测试指南

## 前置准备

### 1. 启动后端服务
```bash
cd backend
./gradlew bootRun
```
等待看到 "Started Application" 日志，确认后端运行在 `http://localhost:8080`

### 2. 启动前端开发服务器
```bash
# 在项目根目录
npm run dev
# 或
pnpm dev
```
访问 `http://localhost:5173`

### 3. 打开浏览器开发者工具
- **Chrome/Edge**: F12 或 右键 → 检查
- 切换到以下标签页：
  - **Console（控制台）**: 查看日志
  - **Network（网络）**: 查看API请求
  - **Application（应用）→ Local Storage**: 查看本地存储

---

## 测试场景 1: 基础功能验证

### 1.1 用户注册和登录
**目标**: 验证用户系统和初始进度创建

**步骤**:
1. 点击"注册"按钮
2. 填写用户名、密码，完成注册
3. 使用新账号登录

**验证点**:
- ✅ 登录成功后跳转到主页
- ✅ 打开 **Console** 查看日志: `[Login] Progress hydrated from server`
- ✅ 打开 **Local Storage** 检查:
  - `authToken`: 应该有 JWT token 值
  - `username`: 显示您的用户名

**截图位置**: 
- Console → 搜索 "Progress hydrated"
- Application → Local Storage → http://localhost:5173

---

### 1.2 完成一个章节
**目标**: 验证章节完成会触发进度同步

**步骤**:
1. 在主页选择任意词典（如 CET4）
2. 点击"开始章节 1"
3. 快速输入单词（可以故意打错几个）
4. 完成整个章节（约20个单词）

**验证点**:

#### 在 Console 中查看:
```
[ChapterCompletion] Sync successful
```

#### 在 Network 标签中查看:
1. 筛选 `progress` 
2. 应该看到:
   - **Request**: `POST http://localhost:8080/api/progress/patch`
   - **Status**: `200 OK`
3. 点击该请求 → **Payload** 标签，查看发送的数据:
```json
{
  "addMasteredWords": ["abandon", "ability", ...],
  "familiarityUpdates": {
    "abandon": 7,
    "ability": 5,
    ...
  },
  "stats": {
    "totalLearned": 20,
    "daysStudied": 1,
    "currentStreak": 1,
    "lastStudyDate": "2025-11-01"
  }
}
```

4. 点击 **Response** 标签，查看服务器返回:
```json
{
  "schemaVersion": 1,
  "progress": {
    "masteredWords": ["abandon", "ability", ...],
    "familiarity": { ... },
    ...
  },
  "updatedAt": "2025-11-01T13:45:00"
}
```

#### 在 Application → Local Storage 中查看:
- 搜索包含 "masteredWords" 的键
- 应该看到刚学完的单词列表

**如果看到这些，说明基础同步功能正常！** ✅

---

## 测试场景 2: 离线功能验证（T018）

### 2.1 模拟离线完成多章节
**目标**: 验证离线缓冲和自动重放

**步骤**:
1. 在 **Network** 标签中，勾选 **Offline（离线）** 复选框
   - 或按 `Ctrl+Shift+P` → 输入 "offline" → 选择 "Network: Go offline"
2. 完成章节 2（约20个单词）
3. 完成章节 3（约20个单词）
4. 完成章节 4（约20个单词）

**验证点（离线时）**:

#### Console 日志:
```
[ChapterCompletion] Sync failed (offline), patch buffered
[ChapterCompletion] Sync failed (offline), patch buffered
[ChapterCompletion] Sync failed (offline), patch buffered
```

#### Network 标签:
- 应该看到请求显示为 **❌ (failed) net::ERR_INTERNET_DISCONNECTED**

#### Local Storage:
1. 找到键 `progress_patch_buffer_v1`
2. 点击查看值，应该是一个数组，包含 3 个 patch 对象:
```json
[
  {
    "addMasteredWords": [...],
    "familiarityUpdates": {...},
    ...
  },
  { ... },
  { ... }
]
```

### 2.2 恢复在线，触发自动同步
**步骤**:
1. 在 **Network** 标签中，取消勾选 **Offline**
2. 等待 3-5 秒

**验证点（恢复在线后）**:

#### Console 日志:
```
[OfflineReplay] Preparing replay with 3 buffered patches
[OfflineReplay] Coalesced into single patch
[OfflineReplay] Replay successful
[OfflineReplay] Buffer cleared
```

#### Network 标签:
- 应该看到 **1个** `POST /api/progress/patch` 请求
- Status: `200 OK`
- 点击 **Payload** 查看，应该是合并后的数据（包含所有60个单词）

#### Local Storage:
- `progress_patch_buffer_v1` 应该变成空数组 `[]` 或被删除

**如果离线数据成功同步并清空缓冲区，测试通过！** ✅

---

## 测试场景 3: 添加同步状态指示器（可选增强）

为了更直观地看到同步状态，建议在 Typing 页面添加状态指示器。

### 3.1 临时添加状态徽章

打开 `src/pages/Typing/index.tsx`，在文件顶部导入组件（约第 10 行左右）:

```typescript
import { SyncStatusBadge } from '@/components/progress/SyncStatusBadge'
```

然后在 JSX 返回部分添加徽章（找到合适位置，比如页面右上角）:

```tsx
return (
  <div>
    {/* 在页面右上角添加状态指示器 */}
    <div className="fixed top-4 right-4 z-50">
      <SyncStatusBadge />
    </div>
    
    {/* ...原有的 Typing 页面内容... */}
  </div>
)
```

保存后刷新页面，您应该能看到右上角的同步状态徽章：
- 🔄 **同步中...** (蓝色) - 正在上传进度
- ✓ **已同步** (绿色) - 所有数据已同步
- ⏳ **3 待同步** (黄色) - 有离线缓冲数据
- 📵 **离线 (3 待同步)** (灰色) - 当前离线
- ⚠️ **同步失败** (红色) - 同步出错

---

## 测试场景 4: 查看完整进度数据

### 4.1 使用 Console 查看当前进度

在浏览器 Console 中输入并执行：

```javascript
// 查看完整进度
const progress = JSON.parse(localStorage.getItem('userProgress') || '{}')
console.table({
  '已掌握单词数': progress.masteredWords?.length || 0,
  '复习队列长度': progress.reviewQueue?.length || 0,
  '总学习数': progress.stats?.totalLearned || 0,
  '学习天数': progress.stats?.daysStudied || 0,
  '连续天数': progress.stats?.currentStreak || 0,
})

// 查看最近学习的10个单词
console.log('最近掌握的单词:', progress.masteredWords?.slice(-10))

// 查看熟悉度最高的单词
const familiarity = progress.familiarity || {}
const sorted = Object.entries(familiarity)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
console.table(sorted.map(([word, score]) => ({ 单词: word, 熟悉度: score })))
```

### 4.2 查看离线缓冲区状态

```javascript
// 查看缓冲区
const buffer = JSON.parse(localStorage.getItem('progress_patch_buffer_v1') || '[]')
console.log('缓冲区patch数量:', buffer.length)
console.log('缓冲区大小:', JSON.stringify(buffer).length, 'bytes')

// 查看每个patch的详情
buffer.forEach((patch, index) => {
  console.log(`\n=== Patch ${index + 1} ===`)
  console.log('新增掌握单词:', patch.addMasteredWords?.length || 0)
  console.log('熟悉度更新:', Object.keys(patch.familiarityUpdates || {}).length)
  console.log('统计信息:', patch.stats)
})
```

---

## 测试场景 5: 验证数据持久化

### 5.1 刷新页面测试
**步骤**:
1. 完成几个章节
2. 按 `F5` 或 `Ctrl+R` 刷新页面
3. 重新登录（如果需要）

**验证**:
- ✅ 之前学习的进度应该保留
- ✅ `masteredWords` 数量没有丢失
- ✅ 统计数据（总学习数、学习天数）正确

### 5.2 关闭重开浏览器测试
**步骤**:
1. 完成几个章节，确保看到"已同步"状态
2. 完全关闭浏览器
3. 重新打开浏览器，访问 `http://localhost:5173`
4. 重新登录

**验证**:
- ✅ 登录后从服务器加载了之前的进度
- ✅ Console 显示 `[Login] Progress hydrated from server`
- ✅ 学习统计正确显示

---

## 测试场景 6: 错误处理测试

### 6.1 后端服务停止时的行为
**步骤**:
1. 停止后端服务（在后端终端按 `Ctrl+C`）
2. 在前端完成一个章节

**预期行为**:
- ✅ Console 显示 `[ChapterCompletion] Sync failed, patch buffered`
- ✅ 数据保存在 `progress_patch_buffer_v1` 中
- ✅ 状态徽章显示"同步失败"或"离线"
- ✅ 用户可以继续学习，不会丢失数据

### 6.2 恢复后端后的自动同步
**步骤**:
1. 重新启动后端服务: `cd backend && ./gradlew bootRun`
2. 等待服务启动完成
3. 在前端页面等待或刷新页面

**预期行为**:
- ✅ 离线期间的数据自动上传
- ✅ Console 显示 `[OfflineReplay] Replay successful`
- ✅ 缓冲区被清空
- ✅ 状态徽章变为"已同步"

---

## 常见问题排查

### 问题 1: 看不到 Console 日志
**解决方案**:
- 打开 Console 右上角的设置⚙️
- 确保日志级别选择了 "Verbose" 或 "All"
- 清空 Console（🚫图标）后重试

### 问题 2: Network 标签看不到请求
**解决方案**:
- 确保 Network 标签在执行操作**之前**就已打开
- 清空网络日志（🚫图标）
- 勾选 "Preserve log"（保留日志）选项

### 问题 3: 401 Unauthorized 错误
**原因**: Token 过期或未登录
**解决方案**:
1. 检查 Local Storage 中的 `authToken` 是否存在
2. 如果不存在，重新登录
3. 如果存在但仍报错，清除 Local Storage 后重新登录

### 问题 4: 404 Not Found 错误
**原因**: 后端服务未启动或端口不对
**解决方案**:
1. 确认后端运行: `curl http://localhost:8080/api/progress`
2. 检查 `vite.config.ts` 中的代理配置:
```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    },
  },
}
```

### 问题 5: CORS 跨域错误
**解决方案**:
- 使用 Vite 的代理功能（已配置）
- 确保通过 `http://localhost:5173` 访问，不是直接访问后端端口

---

## 快速验证检查清单

完成章节学习后，依次检查：

- [ ] **Console**: 看到 `[ChapterCompletion] Sync successful`
- [ ] **Network**: `POST /api/progress/patch` 返回 200
- [ ] **Local Storage**: `userProgress` 包含新学习的单词
- [ ] **离线测试**: 离线完成章节 → 数据保存到 buffer → 恢复在线 → 自动同步 → buffer 清空
- [ ] **刷新页面**: 进度不丢失
- [ ] **重新登录**: 从服务器恢复进度

**如果以上都通过，说明学习进度集成功能工作正常！** 🎉

---

## 高级验证：查看后端数据

### 方法 1: 使用 curl 查看 API 响应

```bash
# 1. 先登录获取 token
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 2. 查看进度
curl http://localhost:8080/api/progress \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 3. 查看复习队列
curl http://localhost:8080/api/progress/review/queue \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### 方法 2: 查看数据库（SQLite）

```bash
cd backend
sqlite3 data/qwerty.db

# 查看进度表
SELECT user_id, schema_version, updated_at 
FROM user_progress 
LIMIT 5;

# 查看具体用户的进度 JSON
SELECT progress_json 
FROM user_progress 
WHERE user_id = 1;

# 退出
.quit
```

---

## 总结

通过以上测试，您应该能够验证：

1. ✅ **基础功能**: 用户注册/登录、章节完成、进度同步
2. ✅ **离线支持**: 离线缓冲、自动重放、数据合并
3. ✅ **数据持久化**: Local Storage、后端数据库、跨会话恢复
4. ✅ **错误处理**: 网络故障、后端宕机、自动重试

**有任何问题，请查看 Console 日志和 Network 请求详情进行调试！**

📝 测试完成后，建议记录测试结果到 `/docs/TEST_RESULTS.md`
