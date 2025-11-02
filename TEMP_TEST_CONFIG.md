# ⚠️ 临时测试配置 - 请勿提交到主分支

## 修改内容

**文件**: `src/constants/index.ts`

**修改**:
```typescript
// 原值：20 个单词/章节
// 测试值：3 个单词/章节
export const CHAPTER_LENGTH = 3
```

## 影响范围

这个修改会影响：
- ✅ 每章只需输入 3 个单词即可完成
- ✅ 更快触发章节完成事件
- ✅ 更快测试进度同步功能
- ⚠️ 章节总数会变多（如 CET4 从 215章 → 1433章）

## 测试完成后恢复

**方法 1: 手动恢复**
```typescript
export const CHAPTER_LENGTH = 20
```

**方法 2: Git 恢复**
```bash
git checkout src/constants/index.ts
```

**方法 3: 搜索 TODO**
```bash
grep -r "TODO: 测试用" src/
```

## 使用方法

1. ✅ 已修改，保存后前端会自动热更新
2. 刷新浏览器页面
3. 开始任意章节，输入 3 个单词后即可完成
4. 测试完成后记得恢复！

---

**创建时间**: 2025-11-01  
**目的**: 加速学习进度同步功能测试
