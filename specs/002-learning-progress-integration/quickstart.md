# Quickstart: Learning Progress Integration

This guide shows how to hook the typing workflow into the new cloud progress model.

## 1. Concepts Recap
- ProgressPatch: Incremental payload (masteredWords additions, familiarity absolute values, reviewQueue deltas, sessionPointer).
- SessionPointer: (wordsetId, nextIndex) to resume learning.
- Review Queue: Words needing spaced reinforcement.
- Familiarity: 0–10 monotonic level, mastery threshold = 7.

## 2. When to Build a Patch
Trigger a patch in these moments:
1. Chapter completion (mandatory immediate sync). 
2. Mid‑session pointer save (debounced every N=15 words or on component unmount). 
3. Review session completion (immediate sync). 
4. Offline backlog replay (on connectivity regained). 

## 3. Building a Patch (Chapter)
Pseudo:
```ts
import { buildChapterPatch } from '@/services/progress/patchBuilder';

const chapterResult = {
  wordsetId, // chapter/dictionary composite id
  words: chapterWords.map(w => ({
    word: w.text,
    correct: w.correctCount,
    errors: w.errorCount,
  })),
  nextPointer: { wordsetId, nextIndex: 0 } // or next chapter pointer
};

const patch = buildChapterPatch(chapterResult, currentProgress);
queuePatch(patch); // offlineBuffer.enqueue
flushIfNeeded(); // triggers network per debounce/threshold
```

## 4. Submitting a Patch
```ts
import { submitBufferedPatches } from '@/services/progress/offlineBuffer';
await submitBufferedPatches();
```
Behavior:
- Coalesces queued patches into one merged patch.
- Calls POST /api/progress/patch.
- On success replaces local progress atom with server snapshot.
- On failure retains queue (exponential backoff, user can manual retry).

## 5. Session Pointer Updates
```ts
import { updateSessionPointer } from '@/services/progress/sessionPointer';
// call after advancing word index
updateSessionPointer({ wordsetId, nextIndex });
```
Internally stores pointer into a lightweight patch (only pointer) and debounces sync.

## 6. Review Flow
```ts
import { startReview, submitReview } from '@/services/progress/review';
const items = await startReview(); // loads queue words
// user answers ... gather results
await submitReview(results); // builds patch with familiarity updates & removals
```

## 7. Offline Support
- Patches stored in localStorage key: `progress_patch_buffer_v1`.
- On `online` event: attempt replay.
- Corrupt buffer (JSON parse fail) → purge & console.warn.

## 8. Atoms (State)
Suggested atoms in `progressAtoms.ts`:
```ts
progressAtom: UserProgress | null
pendingPatchesAtom: ProgressPatch[]
offlineStatusAtom: 'online' | 'offline'
```

## 9. Error Handling Patterns
- 401: trigger existing auth re-login modal.
- 413 / large patch: client should segment (should not occur with chapter sized patches <256KB).
- Network fail: show SyncStatusBadge = error; allow manual retry.

## 10. Testing Checklist
- Chapter → patch contains only changed words & pointer.
- Duplicate submission (retry) produces no duplicate masteredWords.
- Offline three chapters then reconnect merges correctly (union + familiarity clamp).
- Review removes mastered items (familiarity >=7) from queue.
- Streak increments across simulated day boundary.

## 11. Migration Notes
Existing full PUT consumer still works; new code prefers PATCH. Ensure first load still uses GET /api/progress to hydrate atoms before any patch building.

## 12. Minimal Integration Steps
1. Add new service modules (patchBuilder, offlineBuffer, sessionPointer, review, merge).
2. Wire chapter completion component to call buildChapterPatch → enqueue.
3. Add online/offline event listeners to flush buffer.
4. Implement review UI (optional until Phase 5).
5. Add Playwright test covering cross-device resume.

## 13. Future Enhancements (Not in Scope)
- Familiarity decay algorithm.
- Prioritized spaced repetition scheduling.
- Conflict telemetry & server diffing.

## 14. Troubleshooting
| Symptom | Cause | Fix |
|---------|-------|-----|
| Mastered words duplicated | Using full PUT with stale local state | Switch to PATCH then overwrite state with server response |
| Review queue never shrinks | Threshold misconfigured | Verify masteryThreshold constant = 7 |
| Patches never flush offline→online | Event listener not registered | Add window.addEventListener('online', replay) |
| Streak not incrementing | Date util using UTC vs local midnight | Ensure local date (new Date().toISOString().slice(0,10) for lastLearnedDate) |

## 15. Reference
- Spec: `specs/002-learning-progress-integration/spec.md`
- Data Model: `data-model.md`
- API: `contracts.md`
- Plan: `plan.md`
