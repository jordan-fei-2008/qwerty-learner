# Implementation Plan: Learning Progress Integration

**Branch**: `002-learning-progress-integration` | **Date**: 2025-11-01 | **Spec**: `specs/002-learning-progress-integration/spec.md`
**Input**: Feature specification from `/specs/002-learning-progress-integration/spec.md`

## Summary

Integrate the core typing workflow with the persisted cloud progress model so that every chapter completion, in-flight session state, and review outcome materializes into a single canonical `UserProgress` (masteredWords, familiarity map, reviewQueue, stats, sessionPointer). Approach: generate normalized `ProgressPatch` objects at well-defined triggers (chapter complete, periodic pointer update, review submit), batch/debounce and offline-buffer them, then merge via a new PATCH endpoint (union + monotonic familiarity). Familiarity scale (0–10) with mastery threshold (≥7) governs review removal. Review queue capped (1000) and maintained idempotently. Offline multi-chapter work coalesces into one merged patch upon connectivity restoration.

## Technical Context

**Languages**: 
- Frontend: TypeScript (ES2022) with React 18, Vite build.
- Desktop wrapper: Rust (Tauri) - unaffected except for invoking same TS services.

**Primary Frontend Libraries**: React, Jotai (state), Axios/fetch wrapper (existing `http.ts` abstraction), Playwright (e2e), TailwindCSS.

**Backend (External Service)**: Existing progress API (Spring Boot per prior phases) consumed over HTTPS; this repo does not contain backend source—only clients.

**Storage**:
- Local: `localStorage` (existing) for auth token + offline patch buffer.
- Remote: Server-side RDBMS (SQLite in backend) abstracted—no direct changes here.

**Data Contracts (New)**: `ProgressPatch`, `ReviewSessionResult`, `SessionPointer` (see `data-model.md`, `contracts.md`).

**Testing Strategy**:
- Unit: Pure functions mapping input logs -> patch (new tests under `tests/unit/progress/`).
- Integration: Simulated chapter completion triggering network calls with mocked HTTP (under `tests/integration/`).
- E2E: Playwright flows (chapter complete → cross-tab visibility; offline → reconnect sync).

**Target Platforms**: Modern evergreen browsers + Tauri desktop (same code path). Mobile web progressive enhancement (implicit).

**Performance Goals**:
- Chapter completion additional processing < 30ms for typical chapter (≤200 words).
- Sync call latency not gated by UI (fire-and-forget with optimistic UI, success criteria SC-005). 
- Memory: offline buffer ≤ 256KB (truncate beyond).

**Constraints / Non‑functional**:
- Offline-capable (must queue patches if network down).
- Idempotent merges (duplicate submissions safe).
- Familiarity monotonic (no decrease in this phase) & clamped 0–10.
- Review queue max 1000 enforced client-side before transmit.

**Scale / Anticipated Usage**:
- Typical active users concurrent small (≤5k) — client unaffected.
- Per user masteredWords O(10^4) upper bound; patch operations incremental (never send full list except initial load).

**Error Handling**:
- 401 → trigger re-auth flow (already standardized in http interceptor).
- Network / 5xx → retain buffer; exponential backoff scheduler (new) with cap.

**Security / Privacy**:
- No PII in progress payloads; word identifiers only.
- Ensure buffer cleared on logout / user switch.

## Constitution Check

No constitution violations introduced:
- No new sub-projects created.
- Data model complexity contained in single feature folder.
- Offline buffering reuses existing localStorage pattern.

Result: PASS (no remediation tasks required).

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: Adopt Option 1 (single-project frontend + Tauri) — all feature code lives under existing `src/` structure:

Planned Additions:
```text
src/
  services/progress/
    patchBuilder.ts          # Pure functions: logs → ProgressPatch
    merge.ts                 # Client-side optimistic merge helpers
    offlineBuffer.ts         # Queue persist/replay
    review.ts                # Review queue load + submission logic
    sessionPointer.ts        # Pointer update triggers
  hooks/
    useProgressSync.ts       # Or augment existing sync hook
    useReviewSession.ts      # Manage review flow
  state/
    progressAtoms.ts         # Jotai atoms: progress, queue, stats
  components/progress/
    ReviewMode.tsx
    SyncStatusBadge.tsx
  utils/
    date.ts (day boundary helpers)
tests/
  unit/progress/
    patchBuilder.test.ts
    merge.test.ts
  integration/progress/
    chapterSync.test.ts
    offlineReplay.test.ts
  e2e/
    review-flow.spec.ts
```

## Implementation Phases & High-Level Tasks

### Phase 1 (Design Finalization) [DONE]
- Spec, research, data model, contracts, plan context.

### Phase 2 (Core Patch Generation)
1. Implement `patchBuilder` (input: chapterResult {words:[{word, correctCount, errorCount, finalState}]} → ProgressPatch).
2. Familiarity algorithm (correct +1, error +2, clamp 10).
3. Mastery detection (familiarity ≥7 adds to mastered, removes from review queue).
4. Unit tests for edge cases (empty chapter, duplicates, overflow).

### Phase 3 (Sync Orchestration)
1. `offlineBuffer` module (enqueue, serialize, coalesce, replay).
2. Debounce + threshold logic integration with existing sync service.
3. Add PATCH endpoint client method (`progressApi.patchProgress`).
4. Conflict-safe optimistic local merge (apply patch → show UI → reconcile with server response).

### Phase 4 (Session Pointer Automation)
1. Hook into typing component lifecycle to update pointer per N words or on unmount.
2. Persist pointer in local atom + include in next patch.
3. E2E test: resume across browser sessions.

### Phase 5 (Review Mode)
1. Implement `useReviewSession` hook (load queue → generate exercises → collect results).
2. Compute review results → patch (familiarity updates, remove mastered).
3. UI component `ReviewMode.tsx` (basic list / typing flow reuse existing component patterns).
4. E2E: queue drains when mastery achieved.

### Phase 6 (Stats & Day Boundary)
1. Day change detection util (compare stored lastLearnedDate with today).
2. Update todayLearned & streakDays logic inside patch builder.
3. Tests for streak maintenance / reset.

### Phase 7 (Resilience & Edge Cases)
1. Backoff retry scheduler for failed submissions.
2. Buffer corruption detection (try/catch JSON parse → purge + warn).
3. Logout flow clearing buffer & atoms.
4. Hard cap on buffer size (truncate oldest).

### Phase 8 (UX & Telemetry Enhancements) [Stretch]
1. `SyncStatusBadge` component (states: idle, syncing, error, offline, pending N).
2. Minimal logging instrumentation (duration of patch construction, queue size).

### Phase 9 (Documentation & Polish)
1. `quickstart.md` (developer adoption steps).
2. README section update referencing cloud progress integration.
3. Cleanup TODOs, dead code removal.

### Phase 10 (Stabilization)
1. Final audit vs FR & SC checklist.
2. Manual exploratory test matrix (offline toggles, rapid chapters, review only flows).
3. Version bump / changelog entry.

## Complexity Tracking

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) |  |  |
