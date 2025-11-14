# Integration Testing Guide - Learning Progress Feature

## Quick Start

### Prerequisites

- ✅ Frontend implementation complete (14 new files, 4 modified)
- ✅ Backend implementation complete (3 new DTOs, 3 new endpoints)
- ⏳ Backend build & deployment pending

### Build Backend

```bash
cd backend
./mvnw clean package
# or
./gradlew build

# Run locally
java -jar target/qwerty-usersync-*.jar
# Default: http://localhost:8080
```

### Verify Endpoints

```bash
# 1. Login to get JWT token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password"}'

# Save token from response
TOKEN="<your-jwt-token>"

# 2. Test patch endpoint
curl -X POST http://localhost:8080/api/progress/patch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "addMasteredWords": ["test1", "test2"],
    "familiarityUpdates": {"test1": 5, "test2": 8}
  }'

# 3. Test review queue endpoint
curl http://localhost:8080/api/progress/review/queue \
  -H "Authorization: Bearer $TOKEN"

# 4. Test review submit endpoint
curl -X POST http://localhost:8080/api/progress/review/submit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"word": "test1", "correct": true, "mistakes": 0, "finalFamiliarity": 8}
    ]
  }'
```

## Manual Test Scenarios

### Test 1: Offline Multi-Chapter (T018)

**Goal**: Verify offline buffer and patch coalescing

**Steps**:

1. Open app, login, go to Typing page
2. Disconnect network (airplane mode or Dev Tools → Offline)
3. Complete Chapter 1 (20 words)
4. Complete Chapter 2 (20 words)
5. Complete Chapter 3 (20 words)
6. Check browser DevTools:
   - Console: Should see "Failed to sync, queued offline" messages
   - LocalStorage: Check `progress_patch_buffer_v1` - should have 3 patches
7. Reconnect network
8. Wait 5 seconds (auto-replay triggered by online event)
9. Check Network tab: Should see single POST to `/api/progress/patch`
10. Verify LocalStorage: Buffer should be empty
11. Verify backend: GET `/api/progress` → masteredWords should contain all 60 words

**Expected**:

- ✅ All 60 words in masteredWords (union merge)
- ✅ stats.totalLearned = 60
- ✅ stats.daysStudied incremented
- ✅ No duplicate words in masteredWords

---

### Test 2: SessionPointer Resume (T020-T021)

**Goal**: Verify cross-device chapter resume

**Setup**: Two browsers or devices, same account

**Steps**:

1. Device A: Login, start CET4-Chapter-5
2. Type 15 words, observe SyncStatusBadge turns green (synced)
3. Close Device A (do NOT complete chapter)
4. Device B: Login, navigate to CET4
5. Click "Resume" or open Chapter 5
6. Verify typing starts at word #16 (not word #1)

**Checkpoint**: Check DevTools → Network → GET `/api/progress`:

```json
{
  "sessionPointer": {
    "wordsetId": "CET4-5",
    "nextIndex": 15
  }
}
```

**Expected**:

- ✅ Device B resumes from word #16
- ✅ No duplicate learning of words 1-15

---

### Test 3: Review Queue Lifecycle (T025)

**Goal**: Verify review queue add/remove logic

**Steps**:

1. Complete chapter with intentional errors (make mistakes on 5 words)
2. Check DevTools → Network → POST `/api/progress/patch` request:
   ```json
   {
     "addReviewQueue": ["word1", "word2", "word3", "word4", "word5"]
   }
   ```
3. Navigate to Review Mode (add UI button if not present)
4. In review session:
   - Mark "word1" correct (no mistakes) → familiarity should go 5→8
   - Mark "word2" correct (1 mistake) → familiarity should go 4→6
   - Mark "word3" incorrect (3 mistakes) → familiarity should stay 3
5. Submit review → Check POST `/api/progress/review/submit` response
6. Verify reviewQueue in response:
   - ✅ "word1" removed (correct + finalFamiliarity=8 ≥ 7)
   - ✅ "word2" NOT removed (finalFamiliarity=6 < 7)
   - ✅ "word3" NOT removed (incorrect)

**Expected**:

- Words with high mastery (≥7) automatically exit review queue
- Words with low familiarity stay in queue for re-review

---

### Test 4: Stats & Streak (T027)

**Goal**: Verify daily stats and streak logic

**Day 1** (e.g., 2025-01-15):

1. Login, complete 1 chapter
2. Check stats: `daysStudied=1, currentStreak=1, lastStudyDate="2025-01-15"`

**Day 2** (2025-01-16):

1. Login, complete 1 chapter
2. Check stats: `daysStudied=2, currentStreak=2, lastStudyDate="2025-01-16"`

**Day 4** (2025-01-18, skipped Day 3):

1. Login, complete 1 chapter
2. Check stats: `daysStudied=3, currentStreak=1, lastStudyDate="2025-01-18"`
   - ⚠️ Streak reset to 1 (not consecutive)

**Expected**:

- ✅ `daysStudied` increments monotonically
- ✅ `currentStreak` increments for consecutive days
- ✅ `currentStreak` resets when day gap > 1
- ✅ `totalLearned` matches `masteredWords.length`

---

### Test 5: Offline Replay (T030)

**Goal**: Verify offline buffer persistence and replay

**Steps**:

1. Complete 1 chapter online (baseline)
2. Go offline, complete 5 chapters
3. Close browser (simulate crash/shutdown)
4. Reopen browser (still offline)
5. Check LocalStorage → `progress_patch_buffer_v1` should have 5 patches
6. Go online
7. Trigger replay:
   - Auto: Wait for online event listener
   - Manual: Call `syncNow()` from DevTools
8. Monitor Network: Should see single PATCH request with coalesced data
9. Check LocalStorage: Buffer should be cleared

**Expected**:

- ✅ Buffer survives browser close/reopen
- ✅ All 5 chapter data merged correctly
- ✅ No data loss from offline period
- ✅ Buffer cleared after successful sync

---

### Test 6: Final FR Checklist (T035)

#### FR-001: Mastered Words Tracking

- ✅ Words marked as mastered after chapter completion
- ✅ Union merge (no duplicates across devices)
- ✅ Persistent in backend database

#### FR-002: Familiarity Levels (0-10)

- ✅ Initialized on first encounter
- ✅ Increments on correct (+1), decrements on error (+2 clamped at 10)
- ✅ Max merge on conflict (takes higher value)
- ✅ Clamped to [0, 10] range

#### FR-003: Review Queue

- ✅ Words added when familiarity < 7
- ✅ Words removed when correct + familiarity ≥ 7
- ✅ Capacity limited to 1000 items
- ✅ Deduplicated (no duplicate words)

#### FR-004: Learning Statistics

- ✅ `totalLearned` = `masteredWords.length`
- ✅ `daysStudied` increments once per calendar day
- ✅ `currentStreak` tracks consecutive study days
- ✅ `lastStudyDate` in YYYY-MM-DD format

#### FR-005: Session Resume

- ✅ `sessionPointer` saves wordsetId + nextIndex
- ✅ Debounced updates (3s delay after last keystroke)
- ✅ Cross-device resume works
- ✅ Pointer cleared on chapter completion

#### FR-006: Offline Support

- ✅ Patches buffered in LocalStorage (max 256KB)
- ✅ Buffer survives app restart
- ✅ Auto-replay on network restoration
- ✅ Coalescing reduces multiple patches to one

#### FR-007: Merge Semantics

- ✅ masteredWords: union
- ✅ familiarity: max + clamp [0,10]
- ✅ reviewQueue: (union) - (remove set)
- ✅ stats: replace
- ✅ sessionPointer: replace
- ✅ Idempotent (applying same patch twice = same result)

---

## Debugging Tips

### Check Progress State

```javascript
// In browser DevTools console
const progress = JSON.parse(localStorage.getItem('progress_state_v1') || '{}')
console.log('Mastered:', progress.masteredWords?.length)
console.log('Review Queue:', progress.reviewQueue?.length)
console.log('Stats:', progress.stats)
```

### Check Offline Buffer

```javascript
const buffer = JSON.parse(localStorage.getItem('progress_patch_buffer_v1') || '[]')
console.log('Buffered patches:', buffer.length)
console.log('Buffer size:', JSON.stringify(buffer).length, 'bytes')
```

### Monitor Sync Status

```javascript
// In React component with Jotai
import { syncStatusAtom, pendingCountAtom } from '@/state/progressAtoms'
import { useAtomValue } from 'jotai'

function DebugPanel() {
  const syncStatus = useAtomValue(syncStatusAtom)
  const pendingCount = useAtomValue(pendingCountAtom)

  return (
    <div>
      <p>Status: {syncStatus}</p>
      <p>Pending: {pendingCount}</p>
    </div>
  )
}
```

### Backend Logs

Check Spring Boot logs for merge operations:

```bash
tail -f logs/qwerty-usersync.log | grep "patchProgress"
```

---

## Common Issues & Fixes

### Issue 1: "User progress not found" 404

**Cause**: New user without initialized progress record

**Fix**: Ensure user registration creates default progress:

```json
{
  "schemaVersion": 1,
  "masteredWords": [],
  "familiarity": {},
  "reviewQueue": [],
  "stats": {
    "totalLearned": 0,
    "daysStudied": 0,
    "currentStreak": 0,
    "lastStudyDate": null
  },
  "sessionPointer": null
}
```

### Issue 2: Buffer grows too large (>256KB)

**Cause**: Offline for extended period with many chapters

**Behavior**: Automatically truncates to oldest 50% of patches

**Prevention**: Call `syncNow()` periodically when back online

### Issue 3: Streak not updating correctly

**Check**:

1. Server timezone matches client timezone
2. `lastStudyDate` format is YYYY-MM-DD
3. `isConsecutiveDay()` logic in both frontend/backend

**Debug**:

```javascript
import { getTodayDateString, isConsecutiveDay } from '@/utils/date'

console.log('Today:', getTodayDateString())
console.log('Consecutive:', isConsecutiveDay('2025-01-15', '2025-01-16')) // true
console.log('Consecutive:', isConsecutiveDay('2025-01-15', '2025-01-17')) // false
```

---

## Performance Benchmarks (Expected)

| Operation                | Latency (p95) | Notes                           |
| ------------------------ | ------------- | ------------------------------- |
| GET /api/progress        | <50ms         | Small progress (<1000 words)    |
| POST /api/progress/patch | <100ms        | Typical chapter (20-50 words)   |
| POST /api/review/submit  | <100ms        | Typical session (10-20 words)   |
| Offline buffer replay    | <200ms        | Coalesced patch (5-10 chapters) |
| Review queue load        | <50ms         | Queue size <1000                |

**Stress Test**: 10k masteredWords + 1000 reviewQueue → Should stay <500ms for all operations

---

## Next Steps After Manual Testing

1. ✅ Document any bugs found during testing
2. ✅ Update this guide with actual performance numbers
3. ✅ Add unit tests for merge logic (backend)
4. ✅ Add E2E tests with Playwright (frontend)
5. ✅ Deploy to production after all tests pass

## Contact

For questions or issues during testing, refer to:

- Frontend Implementation: `/docs/IMPLEMENTATION_SUMMARY.md`
- Backend Implementation: `/docs/BACKEND_IMPLEMENTATION.md`
- Feature Spec: `/docs/002-learning-progress-integration.md`
