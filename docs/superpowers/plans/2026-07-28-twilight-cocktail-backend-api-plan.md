# Twilight Cocktail Backend API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the PRD third phase: real backend models, seed data, core APIs, daily recommendation idempotency, and frontend API integration.

**Architecture:** Keep the existing FastAPI skeleton and add a layered backend: SQLAlchemy models, Pydantic schemas, repositories, services, and API routers. Use SQLite for local tests and PostgreSQL-compatible SQLAlchemy models for Docker deployment; the frontend uses Axios API calls with a mock fallback only when the backend is unavailable.

**Tech Stack:** FastAPI, SQLAlchemy 2.x, Pydantic 2.x, Alembic, Pytest, Ruff, Mypy, Vue 3, Pinia, Axios, Vitest.

---

## File Structure

Backend additions:

- `twilight-cocktail/backend/app/core/config.py`: environment-driven settings.
- `twilight-cocktail/backend/app/db/session.py`: engine/session factory and dependency.
- `twilight-cocktail/backend/app/db/base.py`: declarative base.
- `twilight-cocktail/backend/app/db/models.py`: SQLAlchemy models for users, cocktails, ingredients, recipe ingredients, steps, daily picks, favorites, view history.
- `twilight-cocktail/backend/app/schemas/*.py`: response/request schemas.
- `twilight-cocktail/backend/app/repositories/*.py`: database access functions.
- `twilight-cocktail/backend/app/services/daily_pick.py`: deterministic weighted recommendation and idempotency.
- `twilight-cocktail/backend/app/api/v1/*.py`: users, cocktails, daily, favorites, history routers.
- `twilight-cocktail/backend/scripts/seed_data.py`: load 20 classic cocktails plus 5 zero/low alcohol mocktails.
- `twilight-cocktail/backend/alembic.ini` and `twilight-cocktail/backend/alembic/`: first migration scaffold.
- `twilight-cocktail/backend/tests/*.py`: model, API, service tests.

Frontend changes:

- `twilight-cocktail/frontend/src/api/cocktails.ts`: API functions with fallback to local mock data.
- `twilight-cocktail/frontend/src/api/daily.ts`: daily pick API with local fallback.
- `twilight-cocktail/frontend/src/stores/cocktails.ts`: load list/detail from API.
- `twilight-cocktail/frontend/src/stores/daily.ts`: reveal via API.

## Task 1: Backend Dependencies and Database Foundation

**Files:**
- Modify: `twilight-cocktail/backend/pyproject.toml`
- Create: `twilight-cocktail/backend/app/core/config.py`
- Create: `twilight-cocktail/backend/app/db/base.py`
- Create: `twilight-cocktail/backend/app/db/session.py`
- Create: `twilight-cocktail/backend/tests/test_db_foundation.py`

- [ ] Write a failing test that creates an in-memory SQLite engine and confirms `Base.metadata.create_all()` creates `users`, `cocktails`, `ingredients`, `cocktail_ingredients`, `cocktail_steps`, `daily_picks`, `favorites`, and `cocktail_view_history`.
- [ ] Run `.venv/bin/python -m pytest tests/test_db_foundation.py -q`; expected failure is missing DB modules/models.
- [ ] Add SQLAlchemy, Alembic, and pydantic-settings dependencies.
- [ ] Implement `Base`, engine/session helpers, and model classes with UUID string primary keys for SQLite/Postgres portability.
- [ ] Rerun the test; expected PASS.

## Task 2: Seed Data and Repository Layer

**Files:**
- Create: `twilight-cocktail/backend/app/data/seed_cocktails.py`
- Create: `twilight-cocktail/backend/scripts/seed_data.py`
- Create: `twilight-cocktail/backend/app/repositories/cocktails.py`
- Test: `twilight-cocktail/backend/tests/test_seed_data.py`

- [ ] Write failing tests asserting seed data has at least 25 cocktails, at least 5 non-alcoholic drinks, and every cocktail has ingredients, steps, source, review status, and flavor values.
- [ ] Implement seed data with 20 PRD classic names and 5 mocktails.
- [ ] Implement idempotent seed script and repository list/detail methods.
- [ ] Rerun seed tests; expected PASS.

## Task 3: Core API Routes

**Files:**
- Create: `twilight-cocktail/backend/app/schemas/cocktail.py`
- Create: `twilight-cocktail/backend/app/schemas/user.py`
- Modify/Create API routers under `twilight-cocktail/backend/app/api/v1/`
- Test: `twilight-cocktail/backend/tests/test_api_cocktails.py`

- [ ] Write failing API tests for `POST /api/v1/users/anonymous`, `GET /api/v1/cocktails`, `GET /api/v1/cocktails/{slug}`.
- [ ] Implement schemas and routers.
- [ ] Add app startup initialization for local SQLite when `DATABASE_URL` points to SQLite.
- [ ] Rerun API tests; expected PASS.

## Task 4: Daily Pick, Favorites, and History

**Files:**
- Create: `twilight-cocktail/backend/app/services/daily_pick.py`
- Create: `twilight-cocktail/backend/app/repositories/users.py`
- Create: `twilight-cocktail/backend/app/repositories/daily.py`
- Create: `twilight-cocktail/backend/app/repositories/favorites.py`
- Test: `twilight-cocktail/backend/tests/test_daily_pick.py`

- [ ] Write failing tests for same user/date idempotency, different anonymous users isolation, approved data filtering, favorite idempotency, and history upsert.
- [ ] Implement deterministic weighted daily pick service and API endpoints.
- [ ] Implement favorites and history endpoints.
- [ ] Rerun tests; expected PASS.

## Task 5: Frontend API Integration

**Files:**
- Create: `twilight-cocktail/frontend/src/api/cocktails.ts`
- Create: `twilight-cocktail/frontend/src/api/daily.ts`
- Modify: `twilight-cocktail/frontend/src/stores/cocktails.ts`
- Modify: `twilight-cocktail/frontend/src/stores/daily.ts`
- Modify pages that directly import mock cocktail lists.

- [ ] Add Vitest tests for API fallback behavior when Axios rejects.
- [ ] Implement API calls returning PRD-shaped data.
- [ ] Update stores and pages to call stores instead of importing `cocktails` directly where practical.
- [ ] Keep mock fallback for local frontend-only development.
- [ ] Rerun frontend test/build; expected PASS.

## Task 6: Alembic, README, and Final Verification

**Files:**
- Create: `twilight-cocktail/backend/alembic.ini`
- Create: `twilight-cocktail/backend/alembic/env.py`
- Create: `twilight-cocktail/backend/alembic/versions/0001_initial_schema.py`
- Modify: `twilight-cocktail/README.md`
- Modify: `twilight-cocktail/docker-compose.yml`

- [ ] Add first migration reflecting current models.
- [ ] Update README with migration and seed commands.
- [ ] Run backend tests, ruff, frontend lint/test/build.
- [ ] Run `docker compose config` only if Docker CLI is available.
- [ ] Commit only phase 3 files and avoid unrelated staged files.

## Self-Review

Spec coverage:

- SQLAlchemy models and Alembic: Tasks 1 and 6.
- 20 classics and 5 mocktails: Task 2.
- Anonymous user: Task 3.
- Cocktail list/detail API: Task 3.
- Daily recommendation idempotency: Task 4.
- Favorites and history: Task 4.
- Frontend API integration: Task 5.
- Verification and README: Task 6.

Deferred outside this phase:

- Full pantry CRUD/matching API and academy progress API remain fourth-stage work.
- Production image hosting and licensed image ingestion remain data-source work.
