# Implementation Plan: 用户数据跨设备同步与账户管理

**Branch**: `001-user-data-sync` | **Date**: 2025-11-01 | **Spec**: ./spec.md
**Input**: Feature specification from `specs/001-user-data-sync/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

目标：提供最小化的用户注册、登录与词汇学习进度云端同步能力，使用户可在不同设备继续记忆状态。

核心功能：账号创建、登录加载进度、学习操作增量保存、云端覆盖策略、简单密码找回（安全问题）。

技术方向（约束已给定）：前端沿用现有 Vite + React + TypeScript 结构，不新增大型依赖；新建 `backend` 目录采用 Java Spring Boot + SQLite（文件嵌入式），通过 Vite 开发服务器 proxy 路由到后端。后端不存储词库文件（继续用前端现有静态资源），仅存储按“用户 → JSON blobs”方式的学习进度数据，尽可能贴近前端本地结构以支持未来离线模式无缝切换。安全简化：无复杂加密方案，使用安全问题重置密码。

## Technical Context

**Language/Version (Backend)**: Java 21 (LTS assumed; NEEDS CLARIFICATION if repo JDK pinned)  
**Framework**: Spring Boot (minimal starters: web, jdbc)  
**Frontend Stack**: Existing Vite + React + TypeScript (no new major libs)  
**Primary Dependencies (Backend)**: Spring Boot Web, SQLite JDBC driver, (optional) Spring Validation; avoid heavy ORM (JPA) initially—simple JDBC.  
**Storage**: SQLite file (e.g., `backend/data/app.db`) storing: users, user_progress (JSON blob).  
**Testing**: Backend: JUnit 5 + Spring Boot test; Frontend: existing Playwright e2e + add API contract tests.  
**Target Platform**: macOS dev, JVM portable.  
**Project Type**: Monorepo (frontend + backend).  
**Performance Goals**: Load progress <5s; cross-device visibility <10s; writes batched to avoid >1 write/sec sustained per user.  
**Constraints**: Simplicity; maintain schema compatibility with existing front-end data shape; easy offline potential.  
**Scale/Scope**: Early stage (<<10k users concurrent); single instance SQLite viable.  
**Security Simplification**: Store password hash (basic), security question hash, no advanced auth tokens beyond session/cookie or simple token.  
**Unknowns / NEEDS CLARIFICATION**: 1) Exact JDK version preference. 2) Precise front-end local storage key & JSON schema for progress. 3) Deployment packaging expectations (Docker multi-stage vs local run). 将在 Phase 0 解决。

## Constitution Check

Constitution 模板为空（占位符未定义实际原则）。当前无法评估特定原则合规性 → 记录：

- 原则内容: NEEDS CLARIFICATION（待项目后续补全）。
- 暂无可触发的违规。

Gate 状态：PASS（无约束可违反）。Phase 1 后若补充再评估。

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
backend/
  src/main/java/... (controller, dto, repository, service)
  src/main/resources/schema.sql (users, user_progress)
  data/ (runtime SQLite file)

src/ (existing frontend React code)
  src/services/user/ (API client wrappers)
  src/store/ (extend state for auth + sync)

tests/
  backend/unit/
  backend/integration/
  frontend/e2e/
```

**Structure Decision**: 采用简单单体后端目录新增形式，不重构现有前端结构；数据层使用直接 SQL + JSON blob。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| (none)    |            |                                      |

## Constitution Re-Check (Post Design)

No concrete principles provided in constitution file; design introduces:

- New backend module (monorepo addition) — justified by feature server need.
- SQLite selection aligns with simplicity principle (implied YAGNI).

No violations detected. Pending future constitution content to reassess.
