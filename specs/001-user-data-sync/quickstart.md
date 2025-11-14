# Quickstart: 用户数据同步后端 + 前端集成

## Prerequisites

- Java 21 (or 17 if constraint emerges)
- Node / pnpm/npm per existing project

## Backend (Spring Boot + SQLite)

1. Create `backend` directory with build tool (Gradle or Maven). (Will be scaffolded in implementation.)
2. Dependencies: spring-boot-starter-web, spring-boot-starter-jdbc, sqlite-jdbc, spring-boot-starter-validation (optional), spring-boot-starter-test.
3. `schema.sql` auto-creates tables on startup:

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  security_question TEXT NOT NULL,
  security_answer_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);
CREATE TABLE IF NOT EXISTS user_progress (
  user_id INTEGER PRIMARY KEY,
  schema_version INTEGER NOT NULL,
  progress_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

4. Run backend: `./gradlew bootRun` (or `mvn spring-boot:run`).

## API Endpoints

### Authentication

#### POST /api/auth/register

注册新用户

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "testuser",
    "password": "testpass123",
    "securityQuestion": "What is your pet name?",
    "securityAnswer": "fluffy"
  }'
```

Response: `{"token": "...", "username": "testuser"}`

#### POST /api/auth/login

用户登录

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username": "testuser", "password": "testpass123"}'
```

Response: `{"token": "...", "username": "testuser"}`

#### POST /api/auth/security-question

获取用户的安全问题（用于密码重置）

```bash
curl -X POST http://localhost:8080/api/auth/security-question \
  -H 'Content-Type: application/json' \
  -d '{"username": "testuser"}'
```

Response: `{"username": "testuser", "securityQuestion": "What is your pet name?"}`

#### POST /api/auth/reset-password

重置密码

```bash
curl -X POST http://localhost:8080/api/auth/reset-password \
  -H 'Content-Type: application/json' \
  -d '{
    "username": "testuser",
    "securityAnswer": "fluffy",
    "newPassword": "newpass123"
  }'
```

Response: `{"message": "Password reset successful"}`

### Progress Management

#### GET /api/progress

获取用户进度（需要认证）

```bash
curl -X GET http://localhost:8080/api/progress \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE'
```

Response:

```json
{
  "schemaVersion": 1,
  "dictionary": "CET4",
  "chapter": 3,
  "wordMasteryData": { "word1": 5, "word2": 3 },
  "mistakeBook": ["word3", "word4"],
  "sessionPointer": {
    "wordset": "CET4-chapter3",
    "nextIndex": 42
  }
}
```

#### PUT /api/progress

更新用户进度（需要认证）

```bash
curl -X PUT http://localhost:8080/api/progress \
  -H 'Authorization: Bearer YOUR_TOKEN_HERE' \
  -H 'Content-Type: application/json' \
  -d '{
    "schemaVersion": 1,
    "dictionary": "CET4",
    "chapter": 4,
    "wordMasteryData": {"word1": 6, "word2": 4, "word5": 2},
    "mistakeBook": ["word3"]
  }'
```

Response: `{"message": "Progress updated"}`

### Health Check

#### GET /api/health

检查服务状态

```bash
curl http://localhost:8080/api/health
```

Response: `{"status": "UP", "timestamp": "2024-01-15T10:30:00Z"}`

## Frontend Integration

1. Add proxy in `vite.config.ts`:

```ts
server: { proxy: { '/api': 'http://localhost:8080' } }
```

2. Implement API client wrappers: `src/services/user/api.ts` with fetch helpers for register/login/progress.
3. Extend store: auth slice (token, username, progress state, lastSyncAt, pendingOpsCount).
4. On login success: replace local progress with response progress.
5. Debounced sync: batch changes (3s or 10 ops) -> PUT /api/progress.
6. Immediate sync button triggers flush.

## Features Implemented

### Phase 1-5: Core Authentication & Progress Sync ✅

- User registration with security question
- Login with JWT token generation
- Progress GET/PUT with JSON validation
- Cross-device synchronization
- E2E tests for multi-device scenarios

### Phase 6: Session Resume ✅

- Session pointer persistence (`wordset` + `nextIndex`)
- `useSessionResume()` hook for saving/clearing session
- `SessionResumePrompt` component for UX
- Cross-device session continuity

### Phase 7: Password Reset ✅

- Security question retrieval endpoint
- Password reset with answer verification
- Multi-step frontend form (username → question → answer → success)
- E2E tests for success and error cases

### Phase 8: Polish & Optimization 🚧

- Health check endpoint
- Logging configuration
- Dockerfile for containerization
- API documentation updates

## Testing Flow

- Unit: service layer hashing & progress merge logic (though overwrite is default).
- Integration: register → login → update progress → fetch from new session.
- E2E: Playwright script performing cross-device simulation (two browser contexts).

## Docker Deployment

Build and run with Docker:

```bash
cd backend
docker build -t qwerty-learner-backend .
docker run -p 8080:8080 -v $(pwd)/data:/app/data qwerty-learner-backend
```

With docker-compose (if available):

```bash
docker-compose up
```

## Migration / Versioning

- Add new JSON fields: front-end tolerant if unknown.
- Bump `schemaVersion` when semantics change; treat earlier versions as read-only pass-through until upgrade logic added.

## Operational Notes

- SQLite WAL mode recommended: set `PRAGMA journal_mode=WAL;` after connection.
- Backup: copy `app.db` file (ensure no active writes or use `.backup` pragma).
- Logs: stored in `logs/qwerty-learner.log` (max 10MB, 30 day retention)
- Health checks: Use `/api/health` for monitoring

## Future Enhancements (Not in MVP)

- Email-based password reset.
- Incremental diff endpoint (/progress/ops) replacing full blob.
- Soft delete & audit trail.
- Multi-factor auth.
- Token refresh mechanism
- Rate limiting
