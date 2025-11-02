# Tasks: Learning Progress Integration

Feature: Learning Progress Integration  
Spec: `specs/002-learning-progress-integration/spec.md`  
Plan: `specs/002-learning-progress-integration/plan.md`

## Dependency Graph (User Stories)
```
US1 (P1) ─┬─> US2 (P2)
          ├─> US3 (P2)
          └─> US6 (P3)
US2 ─┬─> US4 (P3)
US3 ─┼─> US5 (P3)
US4 ─┴─> (none)
US5 ─┴─> (none)
US6 ─┴─> (none)
```
Rationale: Foundational chapter completion persistence (US1) must precede error/review accumulation (US2), pointer automation (US3), and offline buffering (US6). Review mode (US4) depends on a populated queue (US2). Stats logic (US5) depends on mastery events (US1) & pointer/session continuity (US3). Offline replay (US6) can be parallel after minimal patch pipeline exists (post US1 core patch builder) but before polishing review & stats.

## Phase 1: Setup
Infrastructure / baseline adjustments before story work.

- [x] T001 Create progress service directory structure in src/services/progress/
- [x] T002 Create types file src/typings/progress.ts (UserProgress, ProgressPatch, SessionPointer, ReviewSessionResult, ChapterResult)
- [x] T003 Add constants file src/constants/progress.ts (masteryThreshold=7, reviewQueueMax=1000, bufferKey)
- [x] T004 Create Jotai atoms file at src/state/progressAtoms.ts (progressAtom, pendingPatchesAtom, offlineStatusAtom)
- [x] T005 Add API client stub src/services/progress/api.ts (getProgress, patchProgress, submitReview stubs)

## Phase 2: Foundational (Core Patch & Merge Engine)
Enables US1 minimal viable path; no story label used per prompt.

- [x] T006 Implement patch builder core in src/services/progress/patchBuilder.ts (buildChapterPatch: chapterResult -> ProgressPatch with masteredWords, familiarity, sessionPointer)
- [x] T007 Implement client merge helpers in src/services/progress/merge.ts (applyPatchToLocalProgress, coalescePatchQueue)
- [x] T008 Implement offline buffer module src/services/progress/offlineBuffer.ts (enqueue, coalesce, persist to localStorage, replay)
- [x] T009 Wire patch submission in src/services/progress/api.ts (POST /api/progress/patch implementation)
- [x] T010 Add day boundary helper in src/utils/date.ts (getTodayDateString, isConsecutiveDay)

## Phase 3: User Story 1 (P1) Chapter Completion Cloud Save
Goal: Persist real chapter outcomes (masteredWords + basic familiarity + pointer) and see on another device.
Independent Test: Complete a chapter -> patch sent -> login elsewhere -> new masteredWords visible.

- [x] T011 [US1] Extend patchBuilder to compute familiarity increments (correct +1, error +2 clamp 10) in src/services/progress/patchBuilder.ts
- [x] T012 [US1] Add mastery detection (familiarity ≥7) & masteredWords append logic in src/services/progress/patchBuilder.ts
- [x] T013 [US1] Implement chapter completion hook in src/hooks/useChapterCompletion.ts (call buildChapterPatch -> enqueue -> immediate sync)
- [x] T014 [US1] Integrate hook into typing completion flow (identify typing component, wire useChapterCompletion)
- [x] T015 [US1] Ensure GET /api/progress hydration on login in src/services/user/progressSync.ts (load before any patch build)

## Phase 4: User Story 2 (P2) Error Words & Familiarity Accumulation
Goal: Errors populate reviewQueue; familiarity map records levels.
Independent Test: Chapter with errors -> reviewQueue contains them, no duplicates.

- [x] T016 [P] [US2] Add reviewQueue handling (add, dedupe, capacity=1000) in src/services/progress/patchBuilder.ts
- [x] T017 [US2] Add reviewQueue union & truncate in merge helper src/services/progress/merge.ts
- [ ] T018 [US2] Test manually: chapter with errors populates reviewQueue without duplicates

## Phase 5: User Story 3 (P2) Session Pointer Automation
Goal: Seamless resume mid-chapter and across chapters.
Independent Test: Learn to index n on device A -> device B shows resume at n.

- [x] T019 [US3] Implement sessionPointer module src/services/progress/sessionPointer.ts (updatePointer with debounce, enqueue pointer-only patch)
- [ ] T020 [P] [US3] Hook pointer updates into typing component lifecycle (call updatePointer every N words or on unmount)
- [ ] T021 [US3] Test manually: mid-chapter exit -> resume pointer persists across sessions

## Phase 6: User Story 4 (P3) Review Mode
Goal: Consume reviewQueue, adjust familiarity, remove mastered items.
Independent Test: Run review for queued words -> words reaching familiarity ≥7 leave queue.

- [x] T022 [US4] Implement review service src/services/progress/review.ts (loadReviewQueue, submitReviewResults -> patch)
- [x] T023 [P] [US4] Create basic ReviewMode component src/components/progress/ReviewMode.tsx (load queue, typing UI, submit)
- [x] T024 [US4] Integrate familiarity escalation & queue removal in patchBuilder src/services/progress/patchBuilder.ts
- [ ] T025 [US4] Test manually: review session removes mastered words from queue

## Phase 7: User Story 5 (P3) Stats & Streaks
Goal: Maintain stats.totalLearned, todayLearned, streakDays.
Independent Test: Simulate two consecutive days mastering words -> streakDays increments.

- [x] T026 [US5] Implement stats calculation in src/services/progress/patchBuilder.ts (day boundary detection, streak logic)
- [ ] T027 [US5] Test manually: multi-day mastery updates streakDays correctly

## Phase 8: User Story 6 (P3) Offline Buffer Replay
Goal: Queue patches offline and merge-submit when online.
Independent Test: Offline for multiple chapters -> one merged patch upon reconnect.

- [x] T028 [US6] Add online event listener & replay logic in src/services/user/progressSync.ts
- [x] T029 [US6] Add buffer corruption detection & safe purge in src/services/progress/offlineBuffer.ts
- [ ] T030 [US6] Test manually: offline multi-chapter -> reconnect -> single merged sync

## Phase 9: Polish & UX Enhancements

- [x] T031 Implement SyncStatusBadge component src/components/progress/SyncStatusBadge.tsx (show: idle/syncing/error/offline states)
- [x] T032 Add retry backoff on sync failure in src/services/user/progressSync.ts
- [x] T033 Add logout buffer cleanup in src/services/user/progressSync.ts (clear offlineBuffer on logout)
- [x] T034 Update README with feature overview and usage examples README.md
- [ ] T035 Final FR checklist validation (mark completion in specs/002-learning-progress-integration/requirements.md)

## Parallel Execution Opportunities
Examples (independent files/no collisions):
- After Phase 2: T016 (reviewQueue), T019 (sessionPointer), T022 (review service) can run in parallel once base patchBuilder exists.
- Review UI (T023) parallel with stats logic (T026) after foundational patch pipeline stable.
- SyncStatusBadge (T031) parallel with retry logic (T032).

## MVP Recommendation
Deliver MVP with Phase 1 + Phase 2 + Phase 3 (US1) only:
- Enables core masteredWords persistence & cross-device chapter completion sync.
- Defers review, stats, offline complexity until base validated.

## Task Counts
- Total Tasks: 35 (simplified from 62)
- By User Story:
  - US1: 5 (T011-T015)
  - US2: 3 (T016-T018)
  - US3: 3 (T019-T021)
  - US4: 4 (T022-T025)
  - US5: 2 (T026-T027)
  - US6: 3 (T028-T030)
- Setup / Foundational / Polish: 15

## Independent Test Criteria Summary
- US1: Chapter completion -> remote masteredWords visible within 5s.
- US2: Error words appear once in reviewQueue; no duplicates, capacity respected.
- US3: Resume mid-chapter index consistent across devices after pointer sync.
- US4: Review session raises familiarity & removes mastered (≥7) items from queue.
- US5: Streak increments across consecutive days; resets after a gap.
- US6: Offline multi-chapter merge produces correct union & familiarity caps.

## Format Validation
All tasks follow required format: `- [ ] T### [P]? [US#]? Description with file path`. Story phases include [US#]; setup/foundational/polish omit story label. Parallelizable tasks marked [P]. Manual testing replaces formal unit/integration tests for simplified iteration.

