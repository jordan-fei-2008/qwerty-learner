# ErrorBook Cloud Sync Implementation

## 概述

错题本页面现在支持从云端读取和删除错题数据，实现跨设备同步。

## 实现的功能

### 后端 API

1. **GET /api/progress/word-records** - 获取所有单词记录
2. **POST /api/progress/word-records** - 保存单词记录（已实现）
3. **DELETE /api/progress/word-records?word={word}&dict={dict}** - 删除指定单词的所有记录

### 前端改动

#### 1. cloudAdapter.ts 新增函数

- `getErrorWordRecords()`: 获取错题（wrongCount > 0）
- `deleteWordRecords(word, dict)`: 删除云端的单词记录

#### 2. ErrorBook/index.tsx

- 优先从云端读取错题数据
- 如果云端失败，回退到 IndexedDB
- Console 日志显示数据来源

#### 3. utils/db/index.ts - useDeleteWordRecord

- 双写模式：同时删除 IndexedDB 和云端数据
- 优雅降级：云端删除失败不影响本地删除

## 测试步骤

### 测试 1: 验证错题写入云端

1. **启动后端**

   ```bash
   cd backend && ./gradlew bootRun
   ```

2. **在浏览器中登录**

   - 打开 http://localhost:5173
   - 登录账号

3. **故意打错单词**

   - 选择一个词典和章节
   - 故意输入错误的字母（产生 wrongCount > 0）
   - 完成 5-10 个单词

4. **检查 Console 日志**
   应该看到：

   ```
   [DBAdapter] Word record saved to cloud: [word]
   ```

5. **验证数据库存储**

   ```bash
   sqlite3 backend/data/app.db
   SELECT json_extract(progress_json, '$.wordRecords') FROM user_progress WHERE user_id = 1;
   ```

   应该看到包含 wrongCount > 0 的记录。

### 测试 2: 错题本云端读取

1. **打开错题本页面**

   - 访问 http://localhost:5173/error-book

2. **检查 Console 日志**
   应该看到：

   ```
   [DBAdapter] Retrieved X error word records from cloud
   [ErrorBook] Loaded X records from cloud
   ```

3. **验证错题显示**
   - 错题本应显示之前打错的单词
   - 显示错误次数
   - 可以点击查看详细信息

### 测试 3: 跨设备同步

1. **在设备 A 上产生错题**

   - 登录并故意打错一些单词
   - 确认数据保存到云端

2. **在设备 B（或无痕浏览器）登录**

   - 使用相同账号登录
   - 访问 /error-book 页面

3. **验证跨设备同步**
   - 应该看到设备 A 产生的错题
   - Console 应显示 "Loaded X records from cloud"

### 测试 4: 删除错题

1. **在错题本页面删除一个单词**

   - 点击删除按钮

2. **检查 Console 日志**
   应该看到：

   ```
   [WordRecord] Deleted X records from IndexedDB
   [WordRecord] Deleted X records from cloud
   ```

3. **刷新页面验证**

   - 删除的单词应该不再显示

4. **在另一设备验证**
   - 登录相同账号
   - 访问 /error-book
   - 确认删除的单词也不显示

### 测试 5: 离线降级

1. **断开后端连接**

   - 停止后端服务或断网

2. **访问错题本页面**

   - 应该回退到 IndexedDB 数据
   - Console 显示 "No cloud records, falling back to IndexedDB"

3. **验证功能仍可用**
   - 可以查看 IndexedDB 中的错题
   - 可以删除错题（仅本地）

## 数据流图

```
打字练习 → 产生错题 (wrongCount > 0)
    ↓
useSaveWordRecord (双写)
    ├→ IndexedDB.add()
    └→ cloudAdapter.addWordRecord() → POST /api/progress/word-records
                                            ↓
                                    backend 存储到 progress_json.wordRecords

错题本页面加载
    ↓
cloudAdapter.getErrorWordRecords() → GET /api/progress/word-records
    ↓                                       ↓
    ├→ 成功: 显示云端数据         backend 从 progress_json.wordRecords 读取
    └→ 失败: 回退到 IndexedDB              ↓
                                    过滤 wrongCount > 0

删除错题
    ↓
useDeleteWordRecord (双写)
    ├→ IndexedDB.delete()
    └→ cloudAdapter.deleteWordRecords() → DELETE /api/progress/word-records?word=X&dict=Y
                                                ↓
                                        backend 从 progress_json.wordRecords 中移除匹配项
```

## 已知限制

1. **批量操作**: 当前删除是单个单词，如果需要批量删除可以后续优化
2. **实时同步**: 数据同步依赖刷新页面，未实现 WebSocket 推送
3. **冲突解决**: 如果两个设备同时删除，后到达的操作会覆盖前面的

## 下一步优化

1. 实现批量删除 API
2. 添加后台同步机制（Service Worker）
3. 实现错题本的排序和筛选在云端处理
4. 添加错题导出时优先从云端读取
