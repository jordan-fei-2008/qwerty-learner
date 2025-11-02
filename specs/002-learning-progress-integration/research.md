# Research & Decisions: Learning Progress Integration

## Decision Log Format
Each item:
- Decision
- Rationale
- Alternatives Considered

---

### 1. Familiarity Scale (0~10)
- **Decision**: Use integer scale 0–10; correct +1, wrong +2, cap at 10.
- **Rationale**: Simple mental model; ensures convergence; penalizes错误更明显以优先复习。
- **Alternatives**: (a) Ebbinghaus decay curve (complex, needs time tracking); (b) SM-2 Leitner (overkill early stage).

### 2. Review Removal Threshold
- **Decision**: Remove from `reviewQueue` when familiarity ≥ 7.
- **Rationale**: 70% scale heuristic; leaves buffer (8–10) for stability before mastery plateau。
- **Alternatives**: (a) 5 (过早，易回流); (b) 9 (过迟，队列膨胀)。

### 3. Review Queue Capacity
- **Decision**: Max 1000 entries; reject new overflow (do not evict old).
- **Rationale**: 保留“历史难词”优先，避免 thrash；1000 已超出单次复习人类容量。
- **Alternatives**: (a) LRU 置换（实现复杂度上升）; (b) 时间窗口截断（需时间戳支持）。

### 4. Session Pointer Strategy
- **Decision**: 指向下一待学词；完成最后一章置 null。
- **Rationale**: Resume 行为直观；null 表示“无后续继续点”。
- **Alternatives**: (a) 指向已完成最后词（需额外逻辑跳过）; (b) 保持最后章节首词（易误解）。

### 5. Offline Merge Semantics
- **Decision**: 多章离线 → 合并为一次 patch：
  - masteredWords = 并集（去重按首次出现顺序）
  - familiarity = 累加后 min(10)
  - reviewQueue = 旧 ∪ 新（超上限截断）
- **Rationale**: 最小化请求；保证顺序稳定 & 幂等。
- **Alternatives**: (a) 每章单独重放（增加请求次数）; (b) 全量替换（风险覆盖旧远程增量）。

### 6. Stats Increment Logic
- **Decision**: totalLearned 仅在新单词首次进入 masteredWords 时 +1；todayLearned 同步逻辑；streakDays 基于“自然日连续有新增 masteredWords”。
- **Rationale**: 避免重复 inflate；与“真实进步”绑定。
- **Alternatives**: (a) 基于输入次数；(b) 基于正确率阈值。

### 7. Day Boundary Determination
- **Decision**: 使用本地日期（用户设备时区）跨日；保持 lastLearnedDate ISO 日期（YYYY-MM-DD）。
- **Rationale**: 不依赖服务器时区；简单。
- **Alternatives**: (a) 服务器 UTC 统一（需额外 round trip）；(b) 用户配置时区（复杂）。

### 8. Patch Granularity
- **Decision**: 发送最小必要字段：只包含有变化的顶层键（masteredWords, familiarity, ...）。
- **Rationale**: 减少 payload；提升幂等差异对比简易性。
- **Alternatives**: (a) 始终全量提交（浪费带宽）; (b) 细粒度 word-level ops（需要操作日志模型）。

### 9. Conflict Resolution (Remote vs Local)
- **Decision**: 合并策略本地与远程：
  - masteredWords: 合并去重
  - familiarity: max(remote, local) （之后按增量逻辑）
  - reviewQueue: 并集截断
- **Rationale**: 避免回退学习进度。
- **Alternatives**: (a) 服务器权威覆盖；(b) 客户端胜出（可能丢他端增量）。

### 10. Failure Retry Policy
- **Decision**: 网络 / 5xx 保留本地缓冲；下次任何触发点或手动“立即同步”再尝试；不做指数退避首版。
- **Rationale**: 简化实现；教育用户使用“立即同步”。
- **Alternatives**: (a) 指数退避队列（增加复杂度）；(b) 后台轮询（耗资源）。

### 11. Familiarity Negative / Decay
- **Decision**: 首版不实现被动衰减 / 负向趋势；仅正向累积封顶。
- **Rationale**: 迭代早期验证主循环价值。
- **Alternatives**: (a) 时间衰减（需时间存档）；(b) 错误扣分（抖动较大）。

### 12. Review Queue Ordering
- **Decision**: 维持插入顺序（FIFO-like），不做优先级权重排序。
- **Rationale**: 简单；用户直观“先错先复习”。
- **Alternatives**: (a) familiarity 升序排序（重排成本 & 复杂度）; (b) 加权随机（不可预测）。

### 13. Security / Abuse Consideration
- **Decision**: 客户端 patch 不携带单词元语义（只词标识、熟悉度数值），服务端进行字段白名单验证。
- **Rationale**: 降低伪造风险；后端可加范围校验。
- **Alternatives**: (a) 完全信任客户端（风险高）; (b) 全部服务器重算（需上传详细日志）。

### 14. Telemetry (Deferred)
- **Decision**: 不在本轮纳入 success/failure 详细打点，仅留日志接口扩展点。
- **Rationale**: 保持范围可控。
- **Alternatives**: 事件总线 / 分析流水线（超出当前阶段）。

### 15. Resume Mid-Chapter Granularity
- **Decision**: sessionPointer.nextIndex 表示“下一个待学习词的索引”，实时更新；失败写云端不阻塞本地继续。
- **Rationale**: 中断后最大限度还原位置。
- **Alternatives**: (a) 只在章节完成时更新（丢细粒度进度）；(b) 定时批量刷新（延迟）。

## Consolidated Open Items
无 NEEDS CLARIFICATION 残留；全部已假设并记录，待评审再调。

## Summary
核心决策聚焦：简单可扩展 → 线性熟悉度、集合并集、有限容量队列、最小 patch、幂等合并。后续可演进方向：遗忘模型 / 优先级排序 / 差量操作日志。
