# Feature Specification: Learning Progress Integration

**Feature Branch**: `002-learning-progress-integration`  
**Created**: 2025-11-01  
**Status**: Draft  
**Input**: Integrate existing typing learning pipeline with cloud progress model: map userInputLogs to masteredWords/familiarity/reviewQueue, auto sessionPointer updates, chapter milestone sync, review mode linking, stats auto-increment, offline buffer triggers.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - 云端保存真实学习成果 (Priority: P1)

当用户完成一章打字学习后，系统应把该章节的学习结果（正确掌握的单词、错误单词、学习统计）自动写入云端进度，以便跨设备继续。

**Why this priority**: 章节完成是最自然的“成果确定”时刻，具备高价值的里程碑，跨设备继续依赖这一步。

**Independent Test**: 仅实现该故事即可：完成一章 → 触发一次云端 PUT → 换浏览器登录能看到 masteredWords 数组有新增。

**Acceptance Scenarios**:

1. Given 用户已登录并完成一章, When 显示结果页, Then 自动或点击“保存进度”触发同步，云端返回 200。
2. Given 同一账户在另一设备登录, When 打开测试或查看进度, Then 新增 masteredWords 可见。
3. Given 本章有 0 个正确单词 (极端情况), When 同步, Then 请求成功且 masteredWords 不重复增长。

---

### User Story 2 - 错题与熟悉度积累 (Priority: P2)

错误单词应进入一个待复习队列（reviewQueue）并提升“熟悉度/遗忘指标”结构（familiarity 字段），后续复习可逐步消除。

**Why this priority**: 让学习产生“反馈循环”，形成个性化复习价值，优先级次于基础保存。

**Independent Test**: 只实现该故事 → 打一章产生若干错误 → 同步后 reviewQueue 包含这些词，familiarity 中错误词初始数值存在。

**Acceptance Scenarios**:

1. Given 用户完成一章有 5 个错误词, When 同步, Then reviewQueue 至少包含这 5 个未掌握词。
2. Given 同一错误词已存在于 reviewQueue, When 再次出错, Then 不重复插入（去重）。
3. Given 用户本章无错误, When 同步, Then reviewQueue 不新增项。

---

### User Story 3 - 断点续学自动化 (Priority: P2)

章节学习过程中和完成后应自动维护 sessionPointer（包含词库标识 + 下一学习索引），实现无感 Resume。

**Why this priority**: 提升体验（少手动），且后续 PWA/多端切换高频依赖。

**Independent Test**: 实现后 → 登录设备 A 学到章节 3 第 40 个词 → 关闭 → 设备 B 登录看到“继续第 40 个词”提示。

**Acceptance Scenarios**:

1. Given 用户学习中途退出在第 n 个单词, When 重新登录, Then sessionPointer 指向该词索引。
2. Given 用户完成一章且存在下一章, When 进入下一次学习, Then sessionPointer 指向下一章第 0 个单词。
3. Given 用户完成最后一章, When 同步, Then sessionPointer 置 null 或保持最后状态（Assumption: 置 null）。

---

### User Story 4 - 复习模式驱动 (Priority: P3)

进入复习模式时应从 reviewQueue 拉取待复习单词，完成复习后根据表现调整 familiarity 并可能移除。

**Why this priority**: 构建闭环；减少遗忘，提升学习价值。

**Independent Test**: 实现后可仅通过复习模式 → 逐步清空 reviewQueue。

**Acceptance Scenarios**:

1. Given reviewQueue 有 10 个词, When 进入复习模式, Then 载入这些词做题。
2. Given 某词在复习中连续正确达阈值, When 复习结束, Then 该词不再出现在 reviewQueue。
3. Given 网络中断复习完成阶段, When 恢复网络后点击“同步复习结果”, Then 结果成功写入。

---

### User Story 5 - 学习统计与连续天数 (Priority: P3)

系统自动维护 stats（totalLearned, todayLearned, streakDays）并基于自然日切换。

**Why this priority**: 激励长期使用，提高留存。

**Independent Test**: 修改本地日期或模拟学习跨两天 → streakDays 变化符合规则。

**Acceptance Scenarios**:

1. Given 第一次学习当日, When 完成第一批学习, Then todayLearned > 0 且 streakDays 加 1。
2. Given 连续第二天再次学习, When 有新掌握单词, Then streakDays 再加 1。
3. Given 中断一天未学习, When 第三天返回, Then streakDays 重置或按规则递减（Assumption: 重置为 1）。

---

### User Story 6 - 离线缓存回放 (Priority: P3)

离线时所有章节完成事件与复习结果写入本地缓冲，恢复在线后可一键提交。

**Why this priority**: 保障弱网/断网环境下不丢成果。

**Independent Test**: 断网 → 完成一章 → 缓冲出现 → 上网 → 立即同步成功且云端数据一致。

**Acceptance Scenarios**:

1. Given 离线状态完成 1 章, When 恢复在线点击“立即同步”, Then PUT 请求包含该章成果。
2. Given 多章离线连续完成, When 恢复在线, Then 合并成一次或多次（Assumption: 合并一次）提交不丢数据。
3. Given 本地缓冲与云端字段冲突（例如已存在 masteredWords）, When 提交, Then 去重后合并。

### Edge Cases

- 章节完成但无任何单词（空词库或加载失败） → 不应发起无意义同步；若发起后台忽略，返回成功。
- 同一单词在同一章被多次错误与正确交替 → familiarity 应按增量策略，不越界（Assumption: 0~10）。
- reviewQueue 超过设定上限（Assumption: 1000） → 新增时截断或丢弃后加入（Assumption: 截断不再加入）。
- 离线缓冲损坏（JSON parse 失败） → 安全丢弃并记录一次本地 warning。
- 用户登录后切换账户 → 清空本地未提交缓冲，防止串号。

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: 系统必须在“章节完成”事件生成 progress patch（masteredWords 增量 + familiarity 增量 + stats 更新 + sessionPointer）。
- **FR-002**: 系统必须将错误词去重合并进 reviewQueue，并限制最大容量 1000（超出丢弃新溢出项）。
- **FR-003**: 系统必须基于 userInputLogs 计算每个词 familiarity 增量（正确 +1，错误 +2，最大 10）。
- **FR-004**: 系统必须在复习模式中对熟练阈值（Assumption: familiarity ≥ 7）满足的词从 reviewQueue 移除。
- **FR-005**: 系统必须在章节学习过程中实时维护 sessionPointer（章节标识 + 当前/下一词索引）。
- **FR-006**: 系统必须在每日第一次成功掌握新词时，如果是连续自然日则 streakDays +1，否则重置为 1。
- **FR-007**: 系统必须在离线状态下将未提交的 progress patch 队列存储到本地并在恢复在线时自动尝试提交。
- **FR-008**: 系统必须对 masteredWords 合并时去重，保持顺序稳定（旧的在前）。
- **FR-009**: 系统必须在发生合并冲突（本地与云端重复单词）时保证幂等，不产生重复。
- **FR-010**: 系统必须对一次 PUT 请求中仅发送需要更新的字段（允许 null 忽略）。
- **FR-011**: 系统必须在同步失败（网络或 5xx）时保留本地缓冲，用户可手动重试。
- **FR-012**: 系统必须在用户登出时清空缓冲与 sessionPointer（除非未提交缓冲用户确认放弃）。
- **FR-013**: 系统必须在成功同步后返回的服务端版本覆盖本地 progress 对应字段。
- **FR-014**: 系统应在 PUT 失败 401 时触发一次静默登出流程或刷新提示（Assumption: 弹出重新登录提示）。
- **FR-015**: 系统应提供“立即同步”操作在存在待提交 patch 时立刻发起。

### Key Entities

- **ProgressPatch**: { masteredWordsΔ[], familiarityΔ{word:delta}, reviewQueueAdd[], reviewQueueRemove[], statsΔ, sessionPointer }
- **SessionPointer**: { wordsetId: string, nextIndex: number }
- **FamiliarityMap**: { word: level (0~10) }
- **ReviewQueue**: 有序列表（先进先出复习优先级，去重）
- **Stats**: { totalLearned, todayLearned, streakDays, lastLearnedDate }

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 章节完成到云端可见时间（另一设备 GET）≤ 5 秒（90% 情况）。
- **SC-002**: 在连续学习 10 章的过程中，云端 progress 不出现重复单词（重复率 0%）。
- **SC-003**: 离线完成 3 章后恢复在线，同步结果与本地预期一致（字段差异率 0%）。
- **SC-004**: reviewQueue 清空一次复习后，≥80% 被移除的词在 24 小时内不再回流（表征熟练判定有效）。
- **SC-005**: 章节完成主流程额外同步逻辑不使结果页展示延迟 > 300ms（感知上“无额外等待”）。
- **SC-006**: 90% 首次跨设备 Resume 操作能正确定位到 sessionPointer 指示的单词。
- **SC-007**: 用户在 30 分钟“高频学习”（≥200 次词项输入）期间，同步失败导致的丢失事件为 0。

## Assumptions

- Familiarity 取值范围 0~10；正确 +1，错误 +2，封顶 10。
- 熟练阈值: familiarity ≥ 7 视为掌握用于移出 reviewQueue。
- reviewQueue 最大容量 1000，新溢出项直接丢弃（不影响已在队列的旧项）。
- 跨日判断基于本地日期（无需时区服务器校准初版）。
- 章节完成后 sessionPointer 指向下一章节第 0 个词；若无下一章则置 null。
- 离线多章合并为一次提交（合并策略：并集 + familiarity 累加再封顶）。

## Open Questions / Clarifications

（均已给出默认假设，如需变更可后续修改，无 NEEDS CLARIFICATION 标记保留。）

## Risks

- Familiarity 算法可能过于简单，后期需要加入遗忘衰减。
- 大量错误词导致 reviewQueue 接近上限时优先级策略缺失。
- 离线合并可能在极端长时间离线（>7 天）场景下放大冲突复杂度。

## Out of Scope

- 自适应推荐（根据熟悉度动态排序下一学习词）。
- 词根/派生词族聚合统计。
- 服务端差量 PATCH（当前用全量字段 patch 语义）。
