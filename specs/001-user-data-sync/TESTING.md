# 进度同步功能测试指南

## 功能概述

已完成 Phase 5 (User Story 3) 的核心进度同步功能：

- ✅ 后端 API: GET/PUT `/api/progress` with Bearer token authentication
- ✅ 前端调度器: 防抖批处理逻辑 (3 秒防抖，最多 10 个操作批处理)
- ✅ React Hook: `useProgressSync()` 集成 Jotai atoms
- ✅ 同步按钮: 显示待同步数量和状态
- ✅ 测试页面: `/progress-test` 路由

## 测试步骤

### 1. 启动服务

**后端**:

```bash
cd backend
./gradlew bootRun
# 应该在 http://localhost:8080 启动
```

**前端** (另一个终端):

```bash
npm run dev
# 应该在 http://localhost:5173 启动
```

### 2. 用户登录

1. 访问 http://localhost:5173/login
2. 使用测试账号登录:
   - 用户名: `testuser3`
   - 密码: `testpass123`
3. 登录成功后应该自动跳转到首页

### 3. 访问测试页面

访问 http://localhost:5173/progress-test

页面应该显示：

- ✅ 用户信息 (用户名、token、待同步操作数、同步状态、上次同步时间)
- ✅ 当前进度统计 (已掌握单词数、今日学习数、连续打卡天数)
- ✅ 测试操作区域
- ✅ 右上角"立即同步"按钮

### 4. 测试防抖功能

**测试场景 1: 单个操作的自动同步**

1. 在"输入要添加的单词"输入框输入: `hello`
2. 点击"添加掌握的单词"按钮
3. 观察右上角"立即同步"按钮:
   - 应该立即显示红色数字 `1` (待同步操作数)
   - 等待 3 秒后，按钮上的数字应该消失
   - 同时看到"同步中..."状态
4. 打开浏览器开发者工具 -> Network 标签页
5. 应该能看到一个 `PUT /api/progress` 请求，状态码 200

**测试场景 2: 多个快速操作的批处理**

1. 快速连续添加多个单词:
   - `world`
   - `test`
   - `sync`
2. 每次添加后，观察待同步数量应该累加: 1 -> 2 -> 3
3. **不要**点击"立即同步"按钮，等待 3 秒
4. 3 秒后应该只看到**一个** `PUT /api/progress` 请求
5. 这个请求应该包含所有 3 个操作的合并结果

**测试场景 3: 立即同步**

1. 添加一个新单词: `immediate`
2. **立即**点击右上角的"立即同步"按钮
3. 不需要等待 3 秒，应该立即看到同步请求
4. 待同步数量应该立即变为 0

**测试场景 4: 达到批处理上限自动同步**

1. 快速连续添加 10 个单词 (或点击"增加连续打卡天数 +1" 10 次)
2. 当操作数达到 10 时，应该**自动触发同步**，不需要等待 3 秒防抖
3. 在 Network 中应该能看到同步请求

### 5. 测试数据持久化

**测试场景 5: 跨设备数据同步 (核心功能)**

1. 在当前浏览器中添加几个单词，等待同步完成
2. 记下当前的统计数据 (已掌握单词数、今日学习数等)
3. 注销登录 (或直接清除 localStorage)
4. 在**无痕模式**或**另一个浏览器**中访问 http://localhost:5173/login
5. 使用相同账号 `testuser3` 登录
6. 访问 `/progress-test` 页面
7. ✅ 应该看到之前添加的所有单词和统计数据

### 6. 检查后端数据库

```bash
cd backend
sqlite3 data/app.db

# 查看 testuser3 的进度数据
SELECT user_id, schema_version, updated_at,
       substr(progress_json, 1, 100) as progress_preview
FROM user_progress
WHERE user_id = (SELECT id FROM users WHERE username = 'testuser3');

# 完整的进度 JSON (格式化)
SELECT progress_json FROM user_progress
WHERE user_id = (SELECT id FROM users WHERE username = 'testuser3');
```

应该能看到 JSON 包含:

- `masteredWords`: 包含你添加的所有单词
- `stats.totalLearned`: 总学习数
- `stats.todayLearned`: 今日学习数
- `stats.streakDays`: 连续打卡天数

## 预期结果

### ✅ 成功标准

1. **防抖功能**: 3 秒内的多次操作只发送一次请求
2. **批处理**: 多个操作合并为一个 PUT 请求
3. **立即同步**: 点击按钮可以立即触发同步
4. **自动同步**: 达到 10 个操作时自动同步
5. **数据持久化**: 注销后重新登录，数据依然存在
6. **跨设备同步**: 不同浏览器登录同一账号，看到相同数据
7. **UI 反馈**: 待同步数量、同步状态实时显示
8. **Token 认证**: 所有请求携带 Bearer token

### ❌ 常见问题排查

**问题 1: 点击按钮无反应**

- 检查浏览器控制台是否有 JavaScript 错误
- 检查是否已登录 (authTokenAtom 有值)
- 检查 Network 标签页是否有 401 Unauthorized 错误

**问题 2: 同步请求失败 (500 错误)**

- 检查后端日志: `./gradlew bootRun` 输出
- 检查请求 payload 是否符合 ProgressUpdateRequest 结构
- 检查 progress JSON 格式是否正确

**问题 3: 数据没有持久化**

- 检查数据库文件是否存在: `backend/data/app.db`
- 检查 PUT 请求是否返回 200 状态码
- 查询数据库确认数据已写入 (见上面的 SQL 命令)

**问题 4: 跨设备看不到数据**

- 确认登录的是同一个用户名
- 确认第一个设备的数据已经同步成功 (看到 Network 请求成功)
- 检查第二个设备登录后的 Network 标签页，POST `/api/auth/login` 响应中应该包含 `progress` 字段

## 技术细节

### 请求格式

**PUT /api/progress**

```json
{
  "schemaVersion": 1,
  "progress": {
    "masteredWords": ["hello", "world", "test"],
    "familiarity": {},
    "reviewQueue": [],
    "stats": {
      "totalLearned": 3,
      "todayLearned": 3,
      "streakDays": 1
    },
    "sessionPointer": null,
    "archived": []
  }
}
```

**响应 (200 OK)**

```json
{
  "schemaVersion": 1,
  "progress": {
    /* 同上 */
  },
  "updatedAt": "2025-11-01T18:30:45"
}
```

### Headers

```
Authorization: Bearer <token>
Content-Type: application/json
```

## 下一步

测试通过后，可以继续实施:

- ✅ T054: 离线缓冲处理 (localStorage 持久化)
- ✅ T055: 登录时显示未同步数据警告
- ✅ T056: E2E 自动化测试

如有任何问题，请检查:

1. 浏览器控制台 (Console 标签页)
2. Network 标签页 (查看请求/响应)
3. 后端日志 (终端输出)
4. 数据库内容 (SQLite 查询)
