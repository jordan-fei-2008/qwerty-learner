# IndexedDB 到云端迁移测试指南

## 实施概要

已完成将 IndexedDB 数据迁移到云端后端存储，同时保持前端页面逻辑不变。

### 后端变更
1. **新增 API 端点**：
   - `POST /api/progress/word-records` - 保存单词记录
   - `GET /api/progress/word-records?startTime=xxx&endTime=xxx` - 查询单词记录

2. **数据存储**：
   - 单词记录存储在 `user_progress` 表的 `progress_json` 字段中
   - 新增 `wordRecords` 数组字段，包含所有练习记录

### 前端变更
1. **双写机制**：
   - `useSaveWordRecord` hook 同时保存到 IndexedDB（兼容）和云端
   - 确保旧功能正常工作的同时积累云端数据

2. **读取优先级**：
   - Analysis 页面优先从云端读取，失败时降级到 IndexedDB
   - 确保数据可用性

3. **文件修改清单**：
   - `backend/src/main/java/com/qwerty/usersync/service/ProgressService.java` - 添加 word records 方法
   - `backend/src/main/java/com/qwerty/usersync/controller/ProgressController.java` - 添加 API 端点
   - `src/utils/db/cloudAdapter.ts` - 新建云端适配器
   - `src/utils/db/index.ts` - 修改 useSaveWordRecord 添加云端保存
   - `src/pages/Analysis/hooks/useWordStats.ts` - 修改读取逻辑优先使用云端数据

## 测试步骤

### 第一步：验证数据写入云端

1. **登录用户 A**
2. **完成 3-5 个单词的打字练习**
3. **检查 Console 日志**：
   ```
   [WordRecord] Failed to save to cloud... (如果看到这个说明云端保存失败)
   [DBAdapter] Word record saved to cloud: xxx (如果看到这个说明云端保存成功)
   ```
4. **检查后端数据库**：
   ```bash
   sqlite3 data/app.db "SELECT progress_json FROM user_progress WHERE user_id = 1;"
   ```
   应该看到 `wordRecords` 数组中有数据

### 第二步：验证跨设备同步

1. **在浏览器 A 中完成练习**（已登录用户 A）
2. **打开无痕浏览器 B**
3. **登录相同用户 A**
4. **进入 Analysis 页面**（数据统计）
   - 应该显示在浏览器 A 中练习的数据
   - Console 应显示：`[Analysis] Loaded X records from cloud`
5. **进入 ErrorBook 页面**（错题本）
   - 注意：ErrorBook 目前仍使用本地 IndexedDB，所以无痕浏览器中会是空的
   - 需要在步骤三中修复

### 第三步：检查 Analysis 页面数据

在无痕浏览器中：
1. **进入 /analysis 路径**
2. **验证显示内容**：
   - 练习次数热力图
   - 练习词数热力图  
   - WPM 趋势图
   - 正确率趋势图
   - 按键错误统计

如果显示"暂无练习数据"，检查：
- Console 中是否有错误日志
- Network 面板中 `/api/progress/word-records` 请求是否成功（200 OK）
- 响应数据是否包含记录

## 当前限制

### 已解决
✅ 单词记录云端存储  
✅ Analysis 页面云端数据读取  
✅ 向后兼容（本地 IndexedDB 仍然工作）

### 待解决
❌ ErrorBook 页面仍使用 IndexedDB（需要类似 Analysis 的修改）  
❌ 登录时没有将云端数据同步到本地 IndexedDB（可选）  

## 下一步工作

### 选项 A：完全迁移 ErrorBook
修改 ErrorBook 页面，让它也从云端读取数据（类似 Analysis 的实现）

### 选项 B：渐进式废弃 IndexedDB
1. 继续积累云端数据
2. 逐步重构所有依赖 IndexedDB 的页面
3. 最终完全移除 IndexedDB 相关代码

## 回滚方案

如果出现问题，可以快速回滚：
1. 从 Git 恢复以下文件：
   - `src/utils/db/index.ts`
   - `src/pages/Analysis/hooks/useWordStats.ts`
2. 前端将继续使用 IndexedDB
3. 后端新增的 API 端点不影响现有功能

## 数据库备份

测试前建议备份数据库：
```bash
cp data/app.db data/app.db.backup.$(date +%Y%m%d_%H%M%S)
```

恢复：
```bash
cp data/app.db.backup.YYYYMMDD_HHMMSS data/app.db
```
