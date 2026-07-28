# Twilight Cocktail First Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first runnable Twilight Cocktail software prototype from the approved design spec.

**Architecture:** Create an isolated `twilight-cocktail/` project with a Vue 3 PWA frontend, a FastAPI backend skeleton, PostgreSQL in Docker Compose, and mock-data driven pages that keep real API boundaries. Behavior-heavy code is extracted into small TypeScript utilities and tested first.

**Tech Stack:** Vue 3, TypeScript, Vite, Vue Router, Pinia, Tailwind CSS, Axios, ECharts, Vitest, Playwright, FastAPI, Pytest, Ruff, Docker Compose.

---

## File Structure

Create these top-level files:

- `twilight-cocktail/README.md`: startup, commands, current scope, design decisions, next phase.
- `twilight-cocktail/.env.example`: frontend/backend/postgres defaults.
- `twilight-cocktail/.gitignore`: generated file exclusions.
- `twilight-cocktail/docker-compose.yml`: frontend, backend, postgres services.

Frontend files:

- `twilight-cocktail/frontend/package.json`: scripts and dependencies.
- `twilight-cocktail/frontend/vite.config.ts`: Vue, test, PWA configuration.
- `twilight-cocktail/frontend/tailwind.config.ts`: Twilight visual tokens.
- `twilight-cocktail/frontend/src/types/cocktail.ts`: domain types.
- `twilight-cocktail/frontend/src/data/cocktails.ts`: 12 cocktail mock records.
- `twilight-cocktail/frontend/src/data/academy.ts`: 8 lesson records.
- `twilight-cocktail/frontend/src/utils/dailyPick.ts`: date-fixed daily pick and wheel math.
- `twilight-cocktail/frontend/src/utils/pantry.ts`: mock pantry matching.
- `twilight-cocktail/frontend/src/utils/storage.ts`: typed localStorage helpers.
- `twilight-cocktail/frontend/src/stores/*.ts`: user, daily, cocktail, pantry, favorite, academy, app setting stores.
- `twilight-cocktail/frontend/src/router/index.ts`: approved routes.
- `twilight-cocktail/frontend/src/layouts/AppLayout.vue`: responsive top/bottom navigation.
- `twilight-cocktail/frontend/src/components/common/*.vue`: loading, empty, error, image fallback, section heading.
- `twilight-cocktail/frontend/src/components/daily/DailyWheel.vue`: roulette display.
- `twilight-cocktail/frontend/src/components/cocktail/*.vue`: card, flavor chart, ingredient list, step list.
- `twilight-cocktail/frontend/src/pages/*.vue`: approved pages.

Backend files:

- `twilight-cocktail/backend/pyproject.toml`: FastAPI, pytest, ruff, mypy configuration.
- `twilight-cocktail/backend/app/main.py`: app factory, `/health`, CORS.
- `twilight-cocktail/backend/app/api/v1/router.py`: future API router placeholder with `/status`.
- `twilight-cocktail/backend/app/schemas/health.py`: typed response schema.
- `twilight-cocktail/backend/tests/test_health.py`: health and docs tests.

## Task 1: Scaffold Project and Tooling

**Files:**
- Create: `twilight-cocktail/frontend/package.json`
- Create: `twilight-cocktail/frontend/vite.config.ts`
- Create: `twilight-cocktail/frontend/src/main.ts`
- Create: `twilight-cocktail/backend/pyproject.toml`
- Create: `twilight-cocktail/backend/app/main.py`

- [ ] **Step 1: Create frontend and backend directories**

Run:

```bash
mkdir -p twilight-cocktail/frontend twilight-cocktail/backend/app
```

Expected: directories exist and do not overwrite unrelated project files.

- [ ] **Step 2: Add minimal frontend test before app code**

Create `twilight-cocktail/frontend/src/utils/appScope.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

describe('project scope', () => {
  it('names the first prototype explicitly', () => {
    expect('Twilight Cocktail').toBe('Twilight Cocktail')
  })
})
```

- [ ] **Step 3: Add frontend package and test tooling**

Create `package.json`, `vite.config.ts`, `tsconfig*.json`, ESLint, Prettier, Tailwind, and Vite entry files. Run `npm install` and then:

```bash
npm run test -- --run src/utils/appScope.test.ts
```

Expected before app implementation: PASS for the trivial project-scope test.

- [ ] **Step 4: Add backend health test before health endpoint**

Create `twilight-cocktail/backend/tests/test_health.py`:

```python
from fastapi.testclient import TestClient

from app.main import create_app


def test_health_returns_ok() -> None:
    client = TestClient(create_app())

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "twilight-cocktail-api"}
```

Run:

```bash
cd twilight-cocktail/backend
python3 -m pytest tests/test_health.py -q
```

Expected: FAIL because `app.main` or `create_app` does not exist yet.

- [ ] **Step 5: Implement minimal FastAPI app**

Create `backend/app/main.py` with `create_app()` and `/health`, then rerun pytest.

Expected: PASS.

## Task 2: Domain Data and Behavior Tests

**Files:**
- Create: `frontend/src/types/cocktail.ts`
- Create: `frontend/src/data/cocktails.ts`
- Create: `frontend/src/data/academy.ts`
- Create: `frontend/src/utils/dailyPick.ts`
- Create: `frontend/src/utils/pantry.ts`
- Test: `frontend/src/utils/dailyPick.test.ts`
- Test: `frontend/src/utils/pantry.test.ts`

- [ ] **Step 1: Write daily pick tests**

Tests cover:

- same date and same anonymous key returns same slug.
- different dates may select different records but always from candidates.
- wheel stop angle maps to selected index.

Run:

```bash
cd twilight-cocktail/frontend
npm run test -- --run src/utils/dailyPick.test.ts
```

Expected: FAIL because utilities do not exist.

- [ ] **Step 2: Implement daily pick utilities and 12 mock cocktails**

Implement:

- `getTodayKey(date: Date): string`
- `selectDailyCocktail(cocktails, userKey, date): Cocktail`
- `getWheelRotationForIndex(index, total, spins): number`

Rerun daily pick tests.

Expected: PASS.

- [ ] **Step 3: Write pantry matching tests**

Tests cover:

- complete required ingredients returns `ready`.
- one missing required ingredient returns `missingOne`.
- garnish-only missing does not block ready.

Run:

```bash
npm run test -- --run src/utils/pantry.test.ts
```

Expected: FAIL because pantry utility does not exist.

- [ ] **Step 4: Implement pantry matching**

Implement `getPantryMatches(cocktails, pantryIngredientSlugs)` with `ready`, `missingOne`, and `partial`.

Expected after rerun: PASS.

## Task 3: App Shell, Stores, and Shared Components

**Files:**
- Create: `frontend/src/router/index.ts`
- Create: `frontend/src/layouts/AppLayout.vue`
- Create: `frontend/src/stores/*.ts`
- Create: `frontend/src/components/common/*.vue`
- Modify: `frontend/src/App.vue`
- Modify: `frontend/src/main.ts`

- [ ] **Step 1: Add route smoke test**

Create a Vitest test that asserts route paths include `/`, `/daily`, `/cocktails`, `/academy`, `/pantry`, and `/profile`.

Expected before router: FAIL.

- [ ] **Step 2: Implement router and layout**

Implement approved routes with lazy page imports. Use desktop top nav and mobile fixed bottom nav.

Expected after route test: PASS.

- [ ] **Step 3: Implement common state components**

Create loading, empty, error, image fallback, and section heading components. Use stable dimensions and visible focus states.

## Task 4: Core Pages

**Files:**
- Create: `frontend/src/pages/HomePage.vue`
- Create: `frontend/src/pages/DailyPage.vue`
- Create: `frontend/src/pages/DailyResultPage.vue`
- Create: `frontend/src/pages/CocktailListPage.vue`
- Create: `frontend/src/pages/CocktailDetailPage.vue`
- Create: `frontend/src/pages/MakeModePage.vue`
- Create: `frontend/src/pages/AcademyPage.vue`
- Create: `frontend/src/pages/PantryPage.vue`
- Create: `frontend/src/pages/ProfilePage.vue`

- [ ] **Step 1: Write component behavior tests for key utilities used by pages**

Add tests for favorites storage, make-progress storage, and query filter parsing.

Expected before implementation: FAIL.

- [ ] **Step 2: Implement Home and Daily pages**

Home uses editorial hero, daily preview, quick entries, academy progress, and drinking notice. Daily uses `DailyWheel` and stores selected daily cocktail for the current date.

- [ ] **Step 3: Implement list and detail pages**

List supports search, filters, sort, URL query sync, empty state. Detail shows hero, stats, ECharts flavor radar, ingredients, steps, story, source, and start-making link.

- [ ] **Step 4: Implement make mode, academy, pantry, profile**

Make mode persists step progress. Academy shows 8 lessons and local completion. Pantry supports adding/removing mock ingredients and grouped matches. Profile summarizes local data and supports clear local data.

## Task 5: Docker, README, and Verification

**Files:**
- Create: `twilight-cocktail/docker-compose.yml`
- Create: `twilight-cocktail/.env.example`
- Create: `twilight-cocktail/.gitignore`
- Create: `twilight-cocktail/README.md`
- Create: `frontend/Dockerfile`
- Create: `backend/Dockerfile`

- [ ] **Step 1: Add Docker files**

Frontend runs Vite on `5173`. Backend runs Uvicorn on `8000`. PostgreSQL uses local volume and env defaults from `.env.example`.

- [ ] **Step 2: Add README**

Include project intro, tech stack, directory structure, local startup, commands, current scope, design decisions, data/source caveat, and next phase.

- [ ] **Step 3: Run verification**

Run:

```bash
cd twilight-cocktail/frontend
npm run lint
npm run test -- --run
npm run build
cd ../backend
python3 -m pytest -q
python3 -m ruff check .
cd ..
docker compose config
```

Expected: all commands pass.

- [ ] **Step 4: Start dev server for preview**

Run frontend dev server and report URL:

```bash
cd twilight-cocktail/frontend
npm run dev -- --host 127.0.0.1
```

Expected: local app opens at a `localhost` or `127.0.0.1` URL.

## Self-Review

Spec coverage:

- Project location and isolation: Task 1.
- Vue/FastAPI/PostgreSQL/Docker skeleton: Tasks 1 and 5.
- 12 mock cocktails and 8 lessons: Task 2.
- Daily fixed pick and wheel stop mapping: Task 2 and Task 4.
- Core pages: Task 4.
- State stores, route boundaries, localStorage: Tasks 3 and 4.
- Loading/empty/error/image fallback states: Task 3 and Task 4.
- README and startup commands: Task 5.
- Verification commands: Task 5.

No placeholders are intentional implementation gaps; scope deferred items are explicitly listed in the design spec as later phases.

