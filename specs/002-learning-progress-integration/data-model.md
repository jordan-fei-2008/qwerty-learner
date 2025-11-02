# Data Model: Learning Progress Integration

## Overview
Integrates typing session outcomes into persisted user progress enabling cross-device continuity, review, and statistics.

## Entities

### UserProgress (Persisted Aggregate)
| Field | Type | Nullable | Description | Rules / Validation |
|-------|------|----------|-------------|--------------------|
| masteredWords | string[] | no | All globally mastered unique words (order by first mastery time) | No duplicates; append-only except future archive feature |
| familiarity | Map<string,int> | no | Per word familiarity level (0~10) | 0 ≤ value ≤ 10 |
| reviewQueue | string[] | no | FIFO list of words needing review | Max 1000; unique; order stable |
| stats.totalLearned | int | no | Count of unique mastered words | = masteredWords.length (consistency check) |
| stats.todayLearned | int | no | Mastered new words acquired today | Reset on day change |
| stats.streakDays | int | no | Consecutive calendar days with ≥1 new mastery | ≥ 0 |
| stats.lastLearnedDate | string (YYYY-MM-DD) | yes | Last day with new mastery | ISO date pattern |
| sessionPointer | SessionPointer | yes | Next learning resume point | Null when no further chapters |
| archived | string[] | no | Reserved future use | Untouched in this feature |

### SessionPointer
| Field | Type | Nullable | Description | Rules |
|-------|------|----------|-------------|------|
| wordsetId | string | no | Dictionary + chapter composite identifier | Non-empty |
| nextIndex | int | no | Index of next word to learn | ≥ 0 |

### ProgressPatch (Transient Client Payload)
| Field | Type | Description | Merge Semantics |
|-------|------|-------------|-----------------|
| masteredWords | string[] | New cumulative mastered list (or new items) | Union (preserve original order) |
| familiarity | Map<string,int> or Map<string,intDelta> | Absolute (client may send final) | Server clamp 0..10; prefer max(remote, incoming) if conflict |
| reviewQueueAdd | string[] | Words to add | Append if not exists; enforce capacity |
| reviewQueueRemove | string[] | Words to remove (e.g., mastered) | Remove if present |
| stats | Partial<Stats> | Updated stat snapshot | Server recompute sanity (totalLearned) |
| sessionPointer | SessionPointer or null | Updated pointer | Replace |

### ReviewSessionResult
| Field | Type | Description |
|-------|------|-------------|
| items | ReviewItemResult[] | Per word outcome |
| completedAt | timestamp | Client completion time |

### ReviewItemResult
| Field | Type | Description |
|-------|------|-------------|
| word | string | Word identifier |
| correctStreak | int | Continuous correct answers in this session |
| mistakes | int | Mistake count |
| finalFamiliarity | int | Proposed familiarity after this review |

## Relationships
- UserProgress 1 : N Familiarity entries (map)
- UserProgress 1 : N reviewQueue words
- One SessionPointer per UserProgress
- ReviewSessionResult not persisted in MVP (derived patch only)

## State Transitions

### Mastery Acquisition
CurrentWord mastered →
1. Add to masteredWords if absent
2. Increment totalLearned & todayLearned
3. Possibly remove from reviewQueue
4. Familiarity set to ≥ threshold (≥7)

### Chapter Completion
1. Aggregate userInputLogs → patch(masteredWords Δ, familiarity Δ, reviewQueueAdd)
2. Update sessionPointer → next chapter or null
3. Submit patch (immediate syncNow)

### Review Completion
1. For each ReviewItemResult adjust familiarity
2. For words reaching threshold remove from reviewQueue
3. Submit patch (debounced or immediate if > X items) (Assumption: immediate)

### Day Rollover
On first mastery event of new calendar day:
1. Reset todayLearned = 0
2. If previous day had mastery and is consecutive → streakDays +1 else streakDays = 1

## Derived / Validation Rules
- stats.totalLearned must equal masteredWords.length (server authoritative fix if mismatch)
- Familiarity increases only; no decay in this phase
- reviewQueue capacity overflow: ignore extra additions beyond 1000
- sessionPointer consistency: nextIndex < wordset length (client best-effort; server trusts but may clamp future)

## Open Evolution Hooks (Not Implemented Now)
- Familiarity decay background job
- Prioritized review (weight by familiarity ascending)
- Operation log for analytics

## Edge Case Handling
| Scenario | Handling |
|----------|----------|
| Empty chapter | Skip patch or send minimal patch (server no-op) |
| Duplicate mastered submissions | Idempotent union no duplication |
| Offline multiple chapter merges | Union + familiarity clamp; single patch |
| Corrupt offline buffer | Discard & log warning (no crash) |
| Oversized reviewQueue adds | Truncate at capacity |

