# Data Model: 用户数据跨设备同步与账户管理

## Overview
Minimal schema focusing on user identity and a JSON blob of progress to stay aligned with front-end structure and offline compatibility.

## Entities

### User
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | INTEGER (auto) | PK | Autoincrement |
| username | TEXT | UNIQUE NOT NULL | May also serve as login id if email omitted |
| email | TEXT | UNIQUE NULLABLE | Optional if username used |
| password_hash | TEXT | NOT NULL | bcrypt hash |
| security_question | TEXT | NOT NULL | Chosen from predefined set or free text |
| security_answer_hash | TEXT | NOT NULL | Case-insensitive hash comparison |
| created_at | DATETIME | NOT NULL | Default CURRENT_TIMESTAMP |
| last_login_at | DATETIME | NULL | Updated on successful login |

### UserProgress
| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| user_id | INTEGER | PK/FK -> User.id | One row per user |
| schema_version | INTEGER | NOT NULL | Start at 1 |
| progress_json | TEXT | NOT NULL | Raw JSON string mirroring front-end structure |
| updated_at | DATETIME | NOT NULL | Auto update trigger |

## progress_json Shape (Version 1)
```jsonc
{
  "masteredWords": ["word1", "word2"],
  "familiarity": { "word1": 3, "word2": 1 },
  "reviewQueue": [
    { "word": "word1", "nextReviewAt": 1730419200000 },
    { "word": "word2", "nextReviewAt": 1730505600000 }
  ],
  "stats": {
    "totalLearned": 120,
    "todayLearned": 15,
    "streakDays": 7
  },
  "sessionPointer": { "wordset": "coca20000", "nextIndex": 340 },
  "archived": ["obsoleteWord"]
}
```

## Validation Rules
- username/email uniqueness enforced by DB.
- password minimum length validated in application layer (e.g., >=8).
- security answer case-insensitive compare (convert to lower + hash before store).
- progress_json must contain mandatory keys: masteredWords, familiarity, reviewQueue, stats.
- familiarity values must be non-negative small integers (implementation guidance: 0-5 typical).

## State Transitions
- Registration: create User + UserProgress with empty baseline JSON.
- Learning Operation: mutate JSON in memory → debounce → persist (update progress_json + updated_at).
- Login: fetch UserProgress; if none (edge) create default baseline.
- Password Reset: after verifying security answer, update password_hash.

## Default Baseline progress_json
```json
{
  "masteredWords": [],
  "familiarity": {},
  "reviewQueue": [],
  "stats": { "totalLearned": 0, "todayLearned": 0, "streakDays": 0 },
  "sessionPointer": null,
  "archived": []
}
```

## Indexing
- PRIMARY KEY on user.id
- UNIQUE on username, email
- UserProgress user_id primary key implies implicit index.

## Migration Strategy
- New fields appended into JSON; bump schema_version when semantic meaning changes.
- Backward compatibility: server accepts older schema_version and stores as-is; upgrade logic optional later.

## Deletion / Archival
- Soft deletion not required at this stage; full delete removes both rows.

