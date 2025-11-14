# Backend Implementation Summary - Learning Progress Integration

## Overview

This document summarizes the backend API implementation for the learning progress integration feature (002-learning-progress-integration). The backend provides incremental patch-based updates with proper merge semantics for offline-first architecture.

## Implementation Date

2025-01-XX

## New API Endpoints

### 1. POST /api/progress/patch

**Purpose**: Incremental progress update with merge semantics

**Request Body** (`ProgressPatchRequest`):

```json
{
  "schemaVersion": 1,
  "addMasteredWords": ["word1", "word2"],
  "familiarityUpdates": { "word1": 8, "word2": 5 },
  "addReviewQueue": ["word3"],
  "removeReviewQueue": ["word1"],
  "stats": {
    "totalLearned": 100,
    "daysStudied": 10,
    "currentStreak": 5,
    "lastStudyDate": "2025-01-15"
  },
  "sessionPointer": {
    "wordsetId": "CET4-chapter-5",
    "nextIndex": 42
  }
}
```

**Response**: `ProgressResponse` with merged progress data

**Merge Semantics**:

- `masteredWords`: Union (deduplicate)
- `familiarity`: Max with clamping [0, 10]
- `reviewQueue`: Add union, then remove set difference (max 1000 items)
- `stats`: Replace
- `sessionPointer`: Replace

### 2. POST /api/progress/review/submit

**Purpose**: Submit review session results

**Request Body** (`ReviewSubmitRequest`):

```json
{
  "items": [
    {
      "word": "abandon",
      "correct": true,
      "mistakes": 0,
      "finalFamiliarity": 8
    },
    {
      "word": "ability",
      "correct": false,
      "mistakes": 2,
      "finalFamiliarity": 4
    }
  ]
}
```

**Response**: `ProgressResponse` with updated progress

**Processing Logic**:

- Updates familiarity for each reviewed word
- Removes words from review queue if `correct && finalFamiliarity >= 7`
- Automatically generates and applies a `ProgressPatchRequest`

### 3. GET /api/progress/review/queue

**Purpose**: Retrieve review queue with familiarity values

**Response** (`ReviewQueueResponse`):

```json
{
  "reviewQueue": ["abandon", "ability", "abstract"],
  "familiarity": {
    "abandon": 5,
    "ability": 3,
    "abstract": 6
  }
}
```

**Notes**: Only returns familiarity values for words in the review queue

## New Backend Files

### DTOs (3 new files)

1. **`ProgressPatchRequest.java`**

   - Incremental patch DTO with optional fields
   - Nested classes: `StatsUpdate`, `SessionPointer`
   - Validation: Min/Max constraints on numeric fields

2. **`ReviewSubmitRequest.java`**

   - Review session results container
   - Nested class: `ReviewItem` (word, correct, mistakes, finalFamiliarity)
   - Validation: Non-null/non-empty checks

3. **`ReviewQueueResponse.java`**
   - Review queue + familiarity subset response
   - Simple POJO with two fields

### Service Layer (1 modified file)

**`ProgressService.java`** - Added 4 new methods:

1. **`patchProgress(userId, patch)`**

   - Main patch merge logic
   - Transactional operation
   - Calls `applyPatchToProgress()` for merge semantics

2. **`submitReview(userId, reviewRequest)`**

   - Converts review results to patch
   - Delegates to `patchProgress()`

3. **`getReviewQueue(userId)`**

   - Extracts review queue from progress JSON
   - Filters familiarity map for queue words only

4. **`applyPatchToProgress(current, patch)`** (private)

   - Core merge algorithm implementation
   - Handles all 5 merge types (masteredWords, familiarity, reviewQueue, stats, sessionPointer)
   - Enforces capacity limits and clamping

5. **`buildReviewPatch(reviewRequest)`** (private)

   - Transforms `ReviewSubmitRequest` into `ProgressPatchRequest`
   - Mastery threshold: familiarity >= 7

6. **`convertToInteger(value)`** (private)
   - Type-safe conversion helper for Jackson deserialization

### Controller Layer (1 modified file)

**`ProgressController.java`** - Added 3 new endpoints:

1. **`@PostMapping("/patch")`**

   - Extracts JWT token from Authorization header
   - Validates user identity
   - Calls `progressService.patchProgress()`
   - Standard error handling (401/400/404/500)

2. **`@PostMapping("/review/submit")`**

   - Review session submission endpoint
   - Token validation + service delegation
   - Returns merged progress after review processing

3. **`@GetMapping("/review/queue")`**
   - Review queue retrieval
   - Token validation
   - Returns filtered familiarity map

## Merge Semantics Details

### 1. Mastered Words (Union)

```java
Set<String> masteredSet = new HashSet<>(currentMastered);
masteredSet.addAll(patch.getAddMasteredWords());
// Result: deduplicated union
```

### 2. Familiarity (Max + Clamp)

```java
int mergedValue = Math.max(currentValue, newValue);
mergedValue = Math.max(0, Math.min(10, mergedValue));
// Result: max(current, new) clamped to [0, 10]
```

### 3. Review Queue (Union - Difference)

```java
Set<String> queueSet = new HashSet<>(currentQueue);
queueSet.addAll(patch.getAddReviewQueue());      // Union
queueSet.removeAll(patch.getRemoveReviewQueue());  // Set difference
// Enforce max capacity: 1000 items
```

### 4. Stats & SessionPointer (Replace)

```java
// Directly replace with patch values if provided
if (patch.getStats() != null) {
    currentStats.put("totalLearned", statsUpdate.getTotalLearned());
    // ... other fields
}
```

## Integration with Frontend

### Frontend Endpoints Used

- `POST /api/progress/patch` ← Called by `patchProgress()` in `src/services/progress/api.ts`
- `POST /api/progress/review/submit` ← Called by `submitReview()` in `src/services/progress/api.ts`
- `GET /api/progress/review/queue` ← Called by `getReviewQueue()` in `src/services/progress/api.ts`

### Data Flow

1. **Chapter Completion**:

   ```
   Frontend: buildChapterPatch() → POST /api/progress/patch → Backend: patchProgress()
   ```

2. **Review Session**:

   ```
   Frontend: submitReviewResults() → POST /api/review/submit → Backend: submitReview() → patchProgress()
   ```

3. **Offline Sync**:
   ```
   Frontend: coalescePatchQueue() → POST /api/progress/patch (single merged patch) → Backend: patchProgress()
   ```

## Database Schema

**No changes required** - Uses existing `UserProgress` table:

```sql
CREATE TABLE user_progress (
    user_id INTEGER PRIMARY KEY,
    schema_version INTEGER NOT NULL,
    progress_json TEXT NOT NULL,  -- JSON blob for flexibility
    updated_at TIMESTAMP NOT NULL
);
```

Progress JSON structure (managed by frontend + backend merge logic):

```json
{
  "masteredWords": ["word1", "word2"],
  "familiarity": { "word1": 8, "word2": 5 },
  "reviewQueue": ["word3", "word4"],
  "stats": {
    "totalLearned": 100,
    "daysStudied": 10,
    "currentStreak": 5,
    "lastStudyDate": "2025-01-15"
  },
  "sessionPointer": {
    "wordsetId": "CET4-chapter-5",
    "nextIndex": 42
  }
}
```

## Validation & Error Handling

### Request Validation

- Jakarta Validation (`@Valid`) on all request bodies
- Constraints:
  - `@NotNull` on required fields
  - `@Min/@Max` on numeric values (familiarity 0-10, mistakes 0-100)
  - `@NotEmpty` on review items list

### Error Responses

- **401 Unauthorized**: Invalid/expired JWT token
- **400 Bad Request**: Validation failure or malformed data
- **404 Not Found**: User progress record not found
- **500 Internal Server Error**: JSON serialization or database errors

### Transaction Safety

- All write operations use `@Transactional` annotation
- Rollback on any exception during merge/update

## Testing Recommendations

### Unit Tests (To Be Implemented)

1. **ProgressServiceTest**:

   - Test patch merge semantics (union, max, replace)
   - Test familiarity clamping [0, 10]
   - Test review queue capacity enforcement (1000 max)
   - Test review patch generation logic

2. **ProgressControllerTest**:
   - Test JWT token validation
   - Test request validation (@Valid)
   - Test error handling (401/400/404/500)

### Integration Tests

1. **Patch Idempotency**: Apply same patch twice, verify result matches once
2. **Offline Coalescing**: Apply coalesced patch (10 patches → 1), verify correctness
3. **Review Workflow**: Submit review → verify queue updates + familiarity changes
4. **Concurrent Updates**: Simulate multiple clients patching simultaneously

### Manual E2E Tests (Reference Frontend T018, T020-T021, T025, T027, T030)

1. Complete chapter offline → go online → verify sync
2. Cross-device progress resume via sessionPointer
3. Review mode: reduce familiarity → add to queue; increase familiarity → remove from queue
4. Multi-chapter offline completion → replay buffer → verify stats correctness

## Performance Considerations

### Optimizations

- **In-memory merge**: All merge logic operates on deserialized Map (no repeated DB reads)
- **Single transaction**: Entire patch application is atomic
- **Capacity limits**: Review queue capped at 1000 to prevent unbounded growth

### Potential Bottlenecks

- **JSON serialization/deserialization**: Large progress objects (10k+ words) may cause latency
  - Mitigation: Consider splitting masteredWords into separate table if >100k words
- **Review queue operations**: Set operations on large queues (O(n))
  - Current limit (1000) keeps this manageable

## Deployment Notes

### Configuration

- No new environment variables required
- Uses existing JWT token validation (`TokenUtil`)
- Compatible with existing SQLite database

### Backwards Compatibility

- **Schema version field** allows graceful migration
- Old clients using `PUT /api/progress` (full replace) continue to work
- New clients use `POST /api/progress/patch` (incremental)

### Monitoring

Recommended metrics:

- Patch size distribution (number of fields per patch)
- Review queue size over time
- Familiarity distribution across users
- Merge operation latency (p50, p95, p99)

## Next Steps

### Immediate (Blocking Manual Tests)

1. ✅ Backend implementation complete
2. ⏳ **Build & deploy backend**
3. ⏳ **Run E2E tests** (T018, T020-T021, T025, T027, T030, T035)

### Future Enhancements

1. **Batch patch API**: `POST /api/progress/patch/batch` for multi-chapter offline sync
2. **Progress analytics**: Aggregate stats API for user insights
3. **Conflict resolution**: Handle cross-device concurrent updates with vector clocks/CRDTs
4. **Review algorithm**: Spaced repetition scheduling (Anki-style intervals)

## File Change Summary

| File                        | Type     | Lines | Description                          |
| --------------------------- | -------- | ----- | ------------------------------------ |
| `ProgressPatchRequest.java` | New DTO  | 160   | Patch request with nested classes    |
| `ReviewSubmitRequest.java`  | New DTO  | 85    | Review results container             |
| `ReviewQueueResponse.java`  | New DTO  | 35    | Review queue response                |
| `ProgressService.java`      | Modified | +220  | Added 6 new methods for patch/review |
| `ProgressController.java`   | Modified | +120  | Added 3 new endpoints                |

**Total**: 3 new files, 2 modified files, ~620 lines added

## API Contract Examples

### Example 1: Chapter Completion Patch

**Request**: `POST /api/progress/patch`

```json
{
  "addMasteredWords": ["abandon", "ability"],
  "familiarityUpdates": {
    "abandon": 7,
    "ability": 8
  },
  "addReviewQueue": ["abstract"],
  "stats": {
    "totalLearned": 102,
    "daysStudied": 11,
    "currentStreak": 6,
    "lastStudyDate": "2025-01-15"
  },
  "sessionPointer": {
    "wordsetId": "CET4-chapter-6",
    "nextIndex": 0
  }
}
```

### Example 2: Review Session Submission

**Request**: `POST /api/progress/review/submit`

```json
{
  "items": [
    { "word": "abandon", "correct": true, "mistakes": 0, "finalFamiliarity": 9 },
    { "word": "ability", "correct": true, "mistakes": 1, "finalFamiliarity": 8 },
    { "word": "abstract", "correct": false, "mistakes": 3, "finalFamiliarity": 4 }
  ]
}
```

**Internal Transformation** (generated `ProgressPatchRequest`):

```json
{
  "familiarityUpdates": {
    "abandon": 9,
    "ability": 8,
    "abstract": 4
  },
  "removeReviewQueue": ["abandon", "ability"]
}
```

_(Only words with correct=true AND finalFamiliarity>=7 are removed from queue)_

## Conclusion

Backend implementation is **complete and ready for testing**. All three new endpoints (`/patch`, `/review/submit`, `/review/queue`) are implemented with proper merge semantics, validation, and error handling. The implementation follows existing code patterns in the backend codebase and maintains compatibility with the frontend API client.

**Status**: ✅ Implementation Complete | ⏳ Testing Pending
