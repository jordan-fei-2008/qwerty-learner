# E2E 测试运行指南

## 前置条件

1. **安装 Playwright**（如果还没安装）:

   ```bash
   npm install
   npx playwright install
   ```

2. **启动后端服务器**:

   ```bash
   cd backend
   ./gradlew bootRun
   # 运行在 http://localhost:8080
   ```

3. **启动前端开发服务器**:

   ```bash
   # 在另一个终端
   npm run dev
   # 运行在 http://localhost:5173
   ```

4. **更新 Playwright 配置**（重要！）:

   编辑 `playwright.config.ts`，将 `baseURL` 改为本地地址：

   ```typescript
   use: {
     baseURL: 'http://localhost:5173',  // 改为本地地址
     trace: 'on-first-retry',
   },
   ```

## 运行测试

### 运行所有测试

```bash
npx playwright test
```

### 运行特定测试文件

```bash
# 注册测试
npx playwright test tests/e2e/register.spec.ts

# 登录测试
npx playwright test tests/e2e/login.spec.ts

# 进度同步测试
npx playwright test tests/e2e/progress-sync.spec.ts
```

### 在特定浏览器中运行

```bash
# Chrome
npx playwright test --project=chromium

# Firefox
npx playwright test --project=firefox

# Safari (WebKit)
npx playwright test --project=webkit
```

### 查看测试报告

```bash
npx playwright show-report
```

### 调试模式

```bash
# UI 模式（推荐）
npx playwright test --ui

# 调试特定测试
npx playwright test tests/e2e/register.spec.ts --debug
```

## 测试文件说明

### 1. register.spec.ts - 用户注册测试

**测试用例**:

- ✅ T032: 成功注册并重定向
- ✅ T033: 重复用户名显示错误
- ✅ 必填字段验证
- ✅ 用户名长度验证（最小 3 个字符）
- ✅ 密码长度验证（最小 8 个字符）

**注意事项**:

- 每次运行会创建唯一用户名（使用时间戳）
- 第二次运行时会测试重复注册拒绝

### 2. login.spec.ts - 用户登录测试

**测试用例**:

- ✅ T044: 登录加载服务器进度
- ✅ T045: 无效凭据显示错误
- ✅ 不存在的用户名显示错误
- ✅ 必填字段验证
- ✅ 登录加载状态显示

**使用的测试账号**:

- 用户名: `testuser3`
- 密码: `testpass123`

**前置条件**:

- 数据库中必须存在 `testuser3` 账号
- 如果不存在，先运行一次注册，或通过 API 手动创建

### 3. progress-sync.spec.ts - 进度同步测试

**测试用例**:

- ✅ T056: 跨会话进度同步验证
- ✅ T057: 离线操作持久化和恢复
- ✅ 立即同步按钮功能
- ✅ 批处理多个操作为单个请求

**测试流程**:

1. 登录并添加单词
2. 等待自动同步（3 秒防抖）
3. 在新会话中登录验证数据

**注意事项**:

- 需要 `/progress-test` 测试页面
- 测试会监听网络请求验证批处理

## 常见问题

### Q1: 测试失败 - 找不到元素

**原因**: baseURL 配置错误或服务器未启动

**解决**:

1. 确认前后端服务器都在运行
2. 检查 `playwright.config.ts` 中的 `baseURL` 是否为 `http://localhost:5173`
3. 手动访问 http://localhost:5173 确认页面加载正常

### Q2: 注册测试失败 - 用户名已存在

**原因**: 数据库中已有相同用户名

**解决**:

- 测试使用时间戳生成唯一用户名，应该不会冲突
- 如果数据库被污染，可以删除 `backend/data/app.db` 重新初始化

### Q3: 登录测试失败 - testuser3 不存在

**原因**: 数据库中没有测试账号

**解决**:

```bash
# 方法 1: 通过 API 创建
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser3",
    "password": "testpass123",
    "securityQuestion": "测试问题",
    "securityAnswer": "测试答案"
  }'

# 方法 2: 通过前端注册页面手动创建
# 访问 http://localhost:5173/register
```

### Q4: 进度同步测试超时

**原因**: 防抖时间太长或网络请求慢

**解决**:

- 测试已包含足够的等待时间（5 秒）
- 检查后端日志是否有错误
- 检查浏览器 Network 标签页确认请求成功

### Q5: 如何清理测试数据

**方法 1**: 删除数据库文件

```bash
rm backend/data/app.db
# 重启后端会自动重新创建
```

**方法 2**: 使用 SQLite 命令清理

```bash
cd backend
sqlite3 data/app.db

-- 查看所有用户
SELECT id, username, created_at FROM users;

-- 删除测试用户
DELETE FROM users WHERE username LIKE 'testuser_%';
DELETE FROM users WHERE username LIKE 'user_%';

-- 退出
.quit
```

## 测试覆盖率

### Phase 3: 用户注册 (100%)

- ✅ T032: 成功注册测试
- ✅ T033: 重复注册拒绝测试

### Phase 4: 用户登录 (100%)

- ✅ T044: 登录加载进度测试
- ✅ T045: 无效凭据测试

### Phase 5: 进度同步 (100%)

- ✅ T056: 跨会话同步测试
- ✅ T057: 离线持久化测试

## 持续集成（CI）

如果要在 CI 环境运行测试，更新 `playwright.config.ts`:

```typescript
use: {
  baseURL: process.env.CI
    ? 'http://localhost:5173'  // CI 环境
    : 'http://localhost:5173',  // 本地环境
  trace: 'on-first-retry',
},
```

GitHub Actions 示例:

```yaml
- name: Run backend
  run: |
    cd backend
    ./gradlew bootRun &
    sleep 10

- name: Run frontend
  run: |
    npm run dev &
    sleep 5

- name: Run E2E tests
  run: npx playwright test
```

## 下一步

完成的 E2E 测试覆盖了核心功能：

- ✅ 用户注册和登录
- ✅ 进度同步（包括跨设备和离线场景）

如需更多测试覆盖，可以添加：

- 密码重置功能测试（Phase 7）
- 断点续学测试（Phase 6）
- 安全问题验证测试
- Token 过期处理测试

---

**测试愉快！** 🧪
