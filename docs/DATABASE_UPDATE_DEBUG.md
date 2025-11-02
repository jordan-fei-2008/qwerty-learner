# 数据库未更新问题调试指引

## 问题诊断

已确认：
- ✅ API 接口被调用（`POST /api/progress/patch`）
- ❌ 数据库表 `user_progress` 未更新

## 已添加详细日志

我在 `ProgressService.patchProgress()` 方法中添加了完整的日志追踪，现在可以看到：
- 方法是否被执行
- 每个步骤的执行情况
- 数据库 update 是否被调用
- 是否有异常抛出

## 重启后端并测试

### 步骤 1: 停止当前后端进程

```bash
# 方法 1: 如果在终端运行，按 Ctrl+C

# 方法 2: 查找并杀死进程
lsof -ti:8080 | xargs kill -9
```

### 步骤 2: 重新启动后端

```bash
cd backend
./gradlew bootRun
```

等待看到：
```
Started Application in X.XXX seconds
```

### 步骤 3: 完成一个章节

1. 刷新前端页面 (Ctrl+Shift+R)
2. 登录
3. 完成一个章节

### 步骤 4: 查看后端日志

#### 方法 A: 在运行 bootRun 的终端直接查看
应该看到类似：
```
2025-11-01 22:xx:xx - [PatchProgress] START - userId: 1
2025-11-01 22:xx:xx - [PatchProgress] Found existing progress for user 1
2025-11-01 22:xx:xx - [PatchProgress] Applied patch merges
2025-11-01 22:xx:xx - [PatchProgress] Calling repository.update() for user 1
2025-11-01 22:xx:xx - [PatchProgress] Database update completed successfully
2025-11-01 22:xx:xx - [PatchProgress] END - returning response
```

#### 方法 B: 查看日志文件
```bash
cd backend
tail -f logs/qwerty-learner.log
```

### 步骤 5: 验证数据库更新

```bash
cd backend

# 查看最新的 updated_at 时间
sqlite3 data/app.db "SELECT user_id, updated_at, length(progress_json) FROM user_progress;"

# 查看完整的 progress_json
sqlite3 data/app.db "SELECT progress_json FROM user_progress WHERE user_id = 1;"

# 美化输出（如果安装了 jq）
sqlite3 data/app.db "SELECT progress_json FROM user_progress WHERE user_id = 1;" | jq '.'
```

## 可能的问题场景

### 场景 1: 日志中没有 [PatchProgress] 开头的任何日志

**说明**: API 请求没有到达 ProgressService

**可能原因**:
1. Controller 层出错（401/400 等）
2. 请求被拦截器/过滤器拦截

**检查**:
- 查看日志中是否有 ERROR 或 WARN
- 在 Network 标签查看 Response，确认返回的是 200 还是其他状态码

### 场景 2: 看到 [PatchProgress] START 但没有后续日志

**说明**: patchProgress 方法执行中出现异常

**检查**:
- 查看日志中紧接着的 ERROR 信息
- 可能是 JSON 解析失败或数据格式问题

### 场景 3: 看到 [PatchProgress] Calling repository.update() 但没有 "completed successfully"

**说明**: update 方法调用时出错

**可能原因**:
1. SQL 语法错误
2. 数据库锁定
3. 事务回滚

**解决**:
查看是否有 SQLException 或其他数据库相关错误

### 场景 4: 所有日志都正常，但数据库仍未更新

**说明**: 可能是事务未提交

**排查**:
1. 检查是否有多个数据库文件（app.db vs qwerty.db）
2. 检查是否查看了错误的数据库
3. 检查 @Transactional 注解是否生效

**验证正确的数据库**:
```bash
# 查看配置文件中的数据库路径
cat backend/src/main/resources/application.yml | grep "url:"

# 应该显示：
# url: jdbc:sqlite:data/app.db
```

## 事务问题排查

如果所有日志都显示正常但数据库未更新，可能是事务配置问题。

### 临时测试：移除事务注解

编辑 `ProgressService.java`，暂时注释掉 `@Transactional`:

```java
// @Transactional  // 临时注释
public ProgressResponse patchProgress(Long userId, ProgressPatchRequest patch) {
    ...
}
```

重新编译并测试：
```bash
./gradlew build -x test
./gradlew bootRun
```

如果这样能更新数据库，说明是事务配置问题。

### 检查事务管理器

在 `Application.java` 或配置类中，应该有：

```java
@EnableTransactionManagement
```

### 检查连接池设置

在 `application.yml` 中添加：

```yaml
spring:
  datasource:
    hikari:
      auto-commit: true
      connection-timeout: 30000
```

## SQLite WAL 模式问题

SQLite 使用 WAL (Write-Ahead Logging) 时，可能需要手动 checkpoint。

### 临时方案：强制 checkpoint

```bash
cd backend
sqlite3 data/app.db "PRAGMA wal_checkpoint(FULL);"
```

然后再查询数据库。

### 永久方案：禁用 WAL

在后端添加配置：

```java
// 在 DataSource 配置中
dataSource.setJdbcUrl("jdbc:sqlite:data/app.db?journal_mode=DELETE");
```

## 快速验证脚本

运行此脚本，一次性检查所有关键点：

```bash
#!/bin/bash
cd /Users/feiy10/work/research/ideas/qwerty-learner/backend

echo "=== 1. 检查后端进程 ==="
lsof -i:8080 || echo "后端未运行"

echo -e "\n=== 2. 检查数据库文件 ==="
ls -lh data/*.db

echo -e "\n=== 3. 检查数据库配置 ==="
grep "url:" src/main/resources/application.yml

echo -e "\n=== 4. 查看当前数据 ==="
sqlite3 data/app.db "SELECT user_id, updated_at, substr(progress_json, 1, 50) FROM user_progress;"

echo -e "\n=== 5. 查看最近日志（最后20行）==="
tail -20 logs/qwerty-learner.log | grep -E "\[PatchProgress\]|ERROR|WARN"

echo -e "\n=== 6. 测试数据库写入 ==="
sqlite3 data/app.db "UPDATE user_progress SET updated_at = datetime('now') WHERE user_id = 1;"
sqlite3 data/app.db "SELECT updated_at FROM user_progress WHERE user_id = 1;"

echo -e "\n=== 完成 ==="
```

保存为 `check_database.sh`，然后执行：
```bash
chmod +x check_database.sh
./check_database.sh
```

## 下一步

1. ✅ 后端已重新编译（包含详细日志）
2. ⏳ 重启后端服务
3. ⏳ 完成一个章节
4. ⏳ 查看后端日志输出
5. ⏳ 根据日志定位具体问题

**请重启后端后，告诉我日志中显示了什么！** 这样我们就能准确定位问题了。
