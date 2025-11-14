# Phase 0 Research: 用户数据跨设备同步与账户管理

## Unknowns Resolved

### 1. Java Version

- Decision: Use Java 21 LTS.
- Rationale: Current stable LTS, long support horizon; good virtual threads future option.
- Alternatives: Java 17 (older LTS, less future proof); Java 8 (too old, lacks modern features).

### 2. Front-end Progress Data Schema

- Decision: Mirror existing localStorage (to be extracted) as a single JSON blob field `progress_json` per user; include version number.
- Rationale: Minimizes mapping friction, simplifies offline parity, allows forward-compatible migrations by bumping version.
- Alternatives: Normalized relational tables (adds complexity, migration overhead), Multiple per-entity tables (overkill for early stage).

### 3. Deployment Packaging

- Decision: Provide Dockerfile multi-stage for backend (optional) but initial focus on local dev via `npm run dev` + backend `./gradlew bootRun`.
- Rationale: Fast iteration; container optional for CI.
- Alternatives: Single combined container (slows front-end HMR), No container at all (harder for later deployment consistency).

## Best Practices Applied

### SQLite Usage

- Decision: Single connection pool (Hikari default), WAL mode enabled for modest concurrency.
- Rationale: Ensures durability with low overhead.
- Alternatives: In-memory (no persistence), Postgres (overkill now).

### Password Handling

- Decision: Hash with bcrypt (Spring default support) even under "simple" requirement.
- Rationale: Baseline security hygiene; low added complexity.
- Alternatives: Plain text (unacceptable), SHA hash alone (unsalted risk).

### Security Question Storage

- Decision: Store hashed (bcrypt) answer; case-insensitive compare.
- Rationale: Avoid reversible storage.
- Alternatives: Plain text (risk), Encrypted (unnecessary overhead now).

### Sync Strategy

- Decision: Write-behind debounce: batch multiple in-flight progress updates within 3s window or 10 operations (whichever first) before persisting.
- Rationale: Reduces write amplification while keeping <10s visibility target.
- Alternatives: Immediate write per action (risk of chattiness), Delayed large interval (risk of data loss on crash).

### Conflict Policy

- Decision: Cloud overwrites local unsynced (per clarified choice); local offline operations lost.
- Rationale: Simplicity; avoids merge UI.
- Mitigation: Provide explicit warning if unsynced buffer >0 at login.

### JSON Schema Versioning

- Decision: Include `schemaVersion` integer; on backend accept older versions and store as-is; migration logic deferred until needed.
- Rationale: Future-proof without complexity now.
- Alternatives: Strict rejection (hurts forward compatibility), Migration now (premature).

## Alternatives Considered Summary

| Area              | Chosen                                        | Alternatives         | Reason Not Chosen                          |
| ----------------- | --------------------------------------------- | -------------------- | ------------------------------------------ |
| Data storage      | Single JSON blob                              | Normalized tables    | Higher complexity, unneeded queries        |
| Auth              | Username/email + password + security question | OAuth / SSO          | Overkill, dependency cost                  |
| Sync              | Debounced batch writes                        | Immediate per action | Too many writes                            |
| Backend framework | Spring Boot minimal                           | Micronaut / Quarkus  | Team familiarity likely higher with Spring |
| DB                | SQLite                                        | Postgres / MySQL     | Deploy overhead                            |

## Open Risks After Research

- Potential front-end schema drift (need extractor step to lock initial shape).
- Security question UX weaker than email reset (user may forget answer).
- Lost offline changes (cloud overwrite) may reduce satisfaction.

## Decisions Checklist

- [x] Java version
- [x] Schema storage approach
- [x] Sync batching
- [x] Conflict policy
- [x] Password/security question handling

All Phase 0 unknowns resolved; proceed to Phase 1 design.
