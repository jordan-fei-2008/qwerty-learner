# Tasks: 用户数据跨设备同步与账户管理

## Dependency Graph (User Story Order)

1. US1 注册 (P1)
2. US2 登录 + 加载进度 (P2) — depends on US1 user accounts existing
3. US3 云端更新进度 (P3) — depends on US2 登录与进度读取
4. US4 断点续学 (P4 可选) — depends on US3 进度保存

MVP Scope: 完成 US1 + US2 即具备跨设备账户与读取进度的最小价值。US3 增加进度写入使体验完整；US4 可延后。

## Phase 1: Setup

- [x] T001 Create backend directory structure `backend/src/main/java` and `backend/src/main/resources`
- [x] T002 Add build file (Gradle) `backend/build.gradle` with Spring Boot, SQLite JDBC dependencies
- [x] T003 Add application entrypoint `backend/src/main/java/.../Application.java`
- [x] T004 Create schema file `backend/src/main/resources/schema.sql` with users & user_progress tables
- [x] T005 Configure SQLite datasource in `backend/src/main/resources/application.yml`
- [x] T006 Add Vite dev proxy update in `vite.config.ts` for `/api` route
- [x] T007 Create front-end service folder `src/services/user` for API client wrappers
- [x] T008 Initialize backend test structure `backend/src/test/java/.../` directories
- [x] T009 Add README section referencing backend usage in `README.md`
- [x] T010 Add basic .gitignore additions for `backend/data/app.db`

## Phase 2: Foundational

- [x] T011 Implement User entity & row mapper `backend/src/main/java/.../model/User.java`
- [x] T012 Implement UserProgress entity `backend/src/main/java/.../model/UserProgress.java`
- [x] T013 [P] Create UserRepository (JDBC) `backend/src/main/java/.../repository/UserRepository.java`
- [x] T014 [P] Create UserProgressRepository (JDBC) `backend/src/main/java/.../repository/UserProgressRepository.java`
- [x] T015 Implement password hashing utility `backend/src/main/java/.../security/PasswordUtil.java`
- [x] T016 Implement security question hashing util `backend/src/main/java/.../security/SecurityAnswerUtil.java`
- [x] T017 Add progress JSON validation helper `backend/src/main/java/.../validation/ProgressValidator.java`
- [x] T018 Add initial default progress JSON constant `backend/src/main/java/.../progress/DefaultProgress.java`
- [x] T019 Setup database initialization runner `backend/src/main/java/.../config/DbInitConfig.java`
- [x] T020 Frontend define TypeScript interfaces for progress `src/typings/userProgress.ts`
- [x] T021 [P] Frontend define auth state slice skeleton `src/store/authSlice.ts`
- [x] T022 Implement API base client `src/services/user/http.ts`

## Phase 3: User Story 1 注册 (P1)

- [ ] T023 [US1] Add RegisterRequest & AuthResponse DTOs `backend/src/main/java/.../dto/RegisterRequest.java`
- [ ] T024 [US1] Implement RegistrationService `backend/src/main/java/.../service/RegistrationService.java`
- [ ] T025 [US1] Add /auth/register controller `backend/src/main/java/.../controller/AuthController.java`
- [x] T026 [US1] Backend validation for username/email/password/security question `backend/src/main/java/.../service/RegistrationService.java`
- [x] T027 [US1] On registration create default progress row `backend/src/main/java/.../service/RegistrationService.java`
- [x] T028 [US1] Frontend registration form UI `src/pages/Register.tsx`
- [x] T029 [US1] Frontend registration API call wrapper `src/services/user/register.ts`
- [x] T030 [US1] Frontend handle success & navigate to login `src/pages/Register.tsx`
- [x] T031 [US1] Frontend show duplicate username/email error `src/pages/Register.tsx`
- [x] T030 [US1] Store token & progress in auth slice `src/store/authSlice.ts`
- [x] T031 [US1] Navigate to home page on success `src/pages/Register.tsx`
- [x] T032 [US1] E2E test: successful registration `tests/e2e/register.spec.ts`
- [x] T033 [US1] E2E test: duplicate registration rejection `tests/e2e/register.spec.ts`

## Phase 4: User Story 2 登录加载进度 (P2)

- [x] T034 [US2] Add LoginRequest DTO `backend/src/main/java/.../dto/LoginRequest.java`
- [x] T035 [US2] Implement LoginService `backend/src/main/java/.../service/LoginService.java`
- [x] T036 [US2] Add token generation simple util (UUID) `backend/src/main/java/.../security/TokenUtil.java`
- [x] T037 [US2] Add /auth/login endpoint (extend AuthController) `backend/src/main/java/.../controller/AuthController.java`
- [x] T038 [US2] Update last_login_at on success `backend/src/main/java/.../service/LoginService.java`
- [x] T039 [US2] Include progress JSON in response `backend/src/main/java/.../service/LoginService.java`
- [x] T040 [US2] Frontend login form page `src/pages/Login.tsx`
- [x] T041 [US2] Frontend login API call `src/services/user/login.ts`
- [x] T042 [US2] Store token & progress in auth slice `src/store/authSlice.ts`
- [x] T043 [US2] Replace local progress state with remote on login `src/store/authSlice.ts`
- [x] T044 [US2] E2E test: login loads progress `tests/e2e/login.spec.ts`
- [x] T045 [US2] E2E test: invalid credentials show error `tests/e2e/login.spec.ts`

## Phase 5: User Story 3 云端更新进度 (P3)

- [x] T046 [US3] Add ProgressUpdateRequest DTO `backend/src/main/java/.../dto/ProgressUpdateRequest.java`
- [x] T047 [US3] Implement ProgressService update method `backend/src/main/java/.../service/ProgressService.java`
- [x] T048 [US3] Add /progress PUT endpoint `backend/src/main/java/.../controller/ProgressController.java`
- [x] T049 [US3] Implement debounce batching logic (frontend) `src/services/user/progressSync.ts`
- [x] T050 [US3] Frontend progress update dispatcher (batch buffer) `src/services/user/progressSync.ts`
- [x] T051 [US3] Frontend hook to enqueue operations `src/hooks/useProgressSync.ts`
- [x] T052 [US3] Immediate sync button component `src/components/SyncNowButton.tsx`
- [x] T053 [US3] Frontend apply remote updates after PUT success `src/store/authSlice.ts`
- [x] T054 [US3] Handle offline buffering `src/services/user/progressSync.ts`
- [x] T055 [US3] Warning on login if unsynced buffer lost `src/components/LoginWarning.tsx`
- [x] T056 [US3] E2E test: update progress then verify on second session `tests/e2e/progress-sync.spec.ts`
- [x] T057 [US3] E2E test: offline operations persisted after reconnect `tests/e2e/progress-sync.spec.ts`

## Phase 6: User Story 4 断点续学 (P4 可选)

- [x] T058 [US4] Extend progress JSON with sessionPointer usage `backend/src/main/java/.../validation/ProgressValidator.java`
- [x] T059 [US4] Frontend maintain session pointer in state `src/hooks/useSessionResume.ts`
- [x] T060 [US4] Frontend resume logic on login `src/services/user/sessionResume.ts`
- [x] T061 [US4] E2E test: resume next word after device switch `tests/e2e/resume-session.spec.ts`

## Phase 7: Password Reset via Security Question (Cross-cutting)

- [x] T062 Add SecurityQuestionRequest DTO `backend/src/main/java/.../dto/SecurityQuestionRequest.java`
- [x] T063 Add SecurityQuestionResponse DTO `backend/src/main/java/.../dto/SecurityQuestionResponse.java`
- [x] T064 Add ResetPasswordRequest DTO `backend/src/main/java/.../dto/ResetPasswordRequest.java`
- [x] T065 Implement PasswordResetService `backend/src/main/java/.../service/PasswordResetService.java`
- [x] T066 Add /auth/security-question endpoint `backend/src/main/java/.../controller/AuthController.java`
- [x] T067 Add /auth/reset-password endpoint `backend/src/main/java/.../controller/AuthController.java`
- [x] T068 Frontend reset password pages `src/pages/ResetPassword.tsx`
- [x] T069 Frontend security question fetch `src/services/user/resetPassword.ts`
- [x] T070 Frontend password reset submit `src/services/user/resetPassword.ts`
- [x] T071 E2E test: password reset success `tests/e2e/reset-password.spec.ts`
- [x] T072 E2E test: wrong security answer rejected `tests/e2e/reset-password.spec.ts`

## Phase 8: Polish & Cross-Cutting

- [ ] T073 Add simple token auth middleware filter `backend/src/main/java/.../security/AuthFilter.java`
- [ ] T074 Implement token store (in-memory map) `backend/src/main/java/.../security/TokenStore.java`
- [ ] T075 Add progress GET endpoint `backend/src/main/java/.../controller/ProgressController.java`
- [x] T076 Add basic logging for auth & progress events `backend/src/main/resources/application.yml`
- [x] T077 Frontend error handling unify for API calls `src/services/user/http.ts`
- [x] T078 Frontend loading states for register/login/progress sync `src/components/LoadingIndicator.tsx`
- [x] T079 Documentation: update `quickstart.md` with latest endpoints `specs/001-user-data-sync/quickstart.md`
- [x] T080 Add simple health check endpoint `backend/src/main/java/.../controller/HealthController.java`
- [x] T081 Add Dockerfile for backend `backend/Dockerfile`
- [ ] T082 Add Playwright cross-device context helper `tests/e2e/utils/multiContext.ts`
- [ ] T083 Refactor duplicated DTO validation logic `backend/src/main/java/.../service/*.java`
- [ ] T084 Accessibility review of forms `src/pages/*.tsx`
- [ ] T085 Performance small test: measure load progress time `tests/e2e/performance.spec.ts`

## Parallel Execution Examples

- Backend repositories (T013, T014) parallel with front-end auth slice (T021) and API client (T022).
- Registration frontend form (T028) parallel with backend registration service (T024) after DTO definitions.
- Progress debounce logic (T049) parallel with frontend progress buffer (T050).

## Independent Test Criteria per User Story

- US1: Register → immediate login attempt shows empty progress.
- US2: Login returns token + progress; replace local state.
- US3: Perform progress changes → flush → re-login new session equals updated state.
- US4: Session pointer restored on different device start.

## MVP Recommendation

Complete tasks through T045 (US2) to deliver cross-device account and progress retrieval. Defer write sync (US3) if timeline constrained.

## Format Validation

All tasks follow `- [ ] T### [P] [US#] Description with file path` pattern; setup/foundational/polish phases exclude story labels by design.
