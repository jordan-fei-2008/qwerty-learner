# API Contracts: Learning Progress Integration

All endpoints are versioned under `/api` (existing pattern). Authentication required (Bearer). Content-Type: application/json. Responses use standard error envelope on failure (existing global handler).

## 1. Get Current Progress

GET /api/progress

Response 200
{
"masteredWords": string[],
"familiarity": { [word:string]: number },
"reviewQueue": string[],
"stats": {
"totalLearned": number,
"todayLearned": number,
"streakDays": number,
"lastLearnedDate": "YYYY-MM-DD" | null
},
"sessionPointer": {
"wordsetId": string,
"nextIndex": number
} | null
}

## 2. Patch Progress (Incremental)

POST /api/progress/patch

Rationale: Avoid semantic overload of existing PUT; remain backward compatible (legacy client can still PUT full object). Server merges patch into stored progress.

Request Body
{
"masteredWords": string[]?, // new mastered words (optional)
"familiarity": { [word:string]: number }?, // absolute updated familiarity values (>= stored)
"reviewQueueAdd": string[]?,
"reviewQueueRemove": string[]?,
"stats": {
"todayLearned": number?, // client hint; server may recompute
"streakDays": number? // seldom sent; server authoritative
}?,
"sessionPointer": { "wordsetId": string, "nextIndex": number } | null?
}

Response 200
{
"status": "merged",
"progress": <Full Progress Object After Merge>
}

Idempotency: Re-sending identical patch yields same resulting state.

Validation Errors 400
{
"error": "VALIDATION_ERROR",
"details": [ { "field": string, "message": string } ]
}

## 3. Replace (Legacy Full Update)

PUT /api/progress
Existing behavior preserved. (Not modified here.) New clients SHOULD prefer PATCH route. Server still executes reconciliation (clamp familiarity, fix stats.totalLearned consistency) before persist.

## 4. Get Review Queue

GET /api/review/queue

Response 200
{
"reviewQueue": string[],
"familiarity": { [word:string]: number }, // subset for queue words for quick UI
"capacity": 1000
}

## 5. Submit Review Session

POST /api/review/submit

Request Body
{
"items": [
{ "word": string, "correctStreak": number, "mistakes": number, "finalFamiliarity": number }
],
"completedAt": string // ISO timestamp
}

Server Logic

- For each item take max(existingFamiliarity, finalFamiliarity) (clamp 0-10)
- If final familiarity >= MASTERY_THRESHOLD (>=7) remove from reviewQueue & add to masteredWords (if not present)
- Recompute stats (increment totalLearned/todayLearned/streakDays as applicable)
- Return merged progress

Response 200
{
"status": "applied",
"progress": <Full Progress Object After Merge>
}

## 6. Immediate Sync Trigger (Optional)

POST /api/progress/sync
(No body) Signals client wants latest server snapshot (used after conflict). Could be replaced by simply GET /api/progress; provided for semantic clarity.

Response 200
<Full Progress Object>

## 7. Error Envelope (Shared)

{
"timestamp": string,
"path": string,
"error": string, // e.g., "VALIDATION_ERROR", "AUTH_REQUIRED", "CONFLICT"
"message": string,
"details": object | null
}

## Conflict Handling

Given server is source of truth and patches are monotonic (only increases or unions), conflict scenario minimal. If server detects a regression attempt (incoming familiarity < stored) it ignores that entry and may include a `conflicts` map in response extension (future enhancement, not in this phase).

## Rate & Size Limits

- Patch body size < 256KB (words arrays). Server returns 413 if exceeded.
- Review submit items <= 500 per request.

## Open Questions (Deferred)

- Bulk fetch of word metadata? (Out of scope here)
- Pagination for very large masteredWords? (Not needed MVP)
