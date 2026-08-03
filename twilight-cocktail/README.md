# 暮调 Twilight Mixbook

每晚一杯的私人调酒手账。

暮调是一款面向日常调酒爱好者的响应式 Web/PWA 应用。它把酒单浏览、每日推荐、酒柜匹配、调酒学院和个人作品记录放在同一个系统里，适合每天调酒时记录灵感、配方、照片和复盘。

线上体验：

- https://bai1623.github.io/weixun-Twilight-Mixbook/

## 功能概览

- **酒谱**：420 款酒单数据，包含经典鸡尾酒、TheCocktailDB 扩展酒款和 80 款中文网红特调。
- **真实步骤**：359 款酒已有来源说明或配方特定制作步骤，其余无可靠来源的酒款保留兜底步骤。
- **每日酒单**：星图式随机推荐，不喜欢可以“再摇一杯”。
- **我的酒柜**：登记已有原料，筛选可以直接制作、只差一种材料和部分匹配的酒。
- **调酒学院**：8 节入门课程，本地记录学习进度。
- **我的作品**：记录每天调过的酒，包括日期、照片、原材料、评分、自我评价、口感关键词和备注。
- **CloudBase 同步**：我的作品支持手动上传到腾讯云 CloudBase，并可从云端恢复。
- **收藏与历史**：支持本地收藏、浏览记录和匿名用户 API。
- **离线静态演示**：GitHub Pages 版本优先读取静态 catalog，后端不可用时仍可独立使用。

## 技术栈

前端：

- Vue 3
- TypeScript
- Vite
- Vue Router
- Pinia
- Tailwind CSS
- Axios
- ECharts
- lucide-vue-next
- Vite PWA
- Vitest

后端：

- FastAPI
- Pydantic
- SQLAlchemy
- Alembic
- PostgreSQL / SQLite
- Pytest
- Ruff
- Mypy

## 目录结构

```text
twilight-cocktail/
├── docker-compose.yml
├── .env.example
├── frontend/
│   ├── public/cocktails/
│   ├── scripts/
│   ├── src/
│   │   ├── components/
│   │   ├── data/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── router/
│   │   ├── stores/
│   │   ├── types/
│   │   └── utils/
│   └── package.json
└── backend/
    ├── app/
    ├── alembic/
    └── tests/
```

## 本地启动

只运行前端：

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

访问：

- http://127.0.0.1:5173/

完整 Docker 环境：

```bash
cp .env.example .env
docker compose up --build
```

访问：

- 前端：http://localhost:5173
- 后端健康检查：http://localhost:8000/health
- Swagger：http://localhost:8000/docs

后端本地开发：

```bash
cd backend
/path/to/python3.12 -m venv .venv
.venv/bin/python -m pip install -e ".[dev]"
.venv/bin/uvicorn app.main:app --reload
```

默认本地后端会创建 `backend/twilight.db` 并导入种子数据。连接 PostgreSQL 时设置：

```bash
export DATABASE_URL="postgresql+psycopg://twilight:twilight@localhost:5432/twilight"
```

数据库迁移：

```bash
cd backend
.venv/bin/alembic upgrade head
```

## 数据与来源

- 经典酒单和图片来自本地审核数据与 TheCocktailDB 公共 API。
- 中文网红特调来自公开中文酒单与社交搜索线索清洗，不登录、不绕过平台反爬。
- `frontend/src/data/chinese-trend-cocktails.json` 保存中文特调结构化源数据。
- `frontend/scripts/build-cocktail-catalog.mjs` 负责合并、清洗并生成 `catalog.json`。

重新生成酒单：

```bash
cd frontend
npm run catalog:build
```

## 验证命令

前端：

```bash
cd frontend
npm run test -- --run
npm run lint
npm run build:pages
```

后端：

```bash
cd backend
.venv/bin/python -m pytest -q
.venv/bin/ruff check .
.venv/bin/mypy app tests
.venv/bin/alembic upgrade head
```

## GitHub Pages

静态构建命令：

```bash
cd frontend
npm run build:pages
```

仓库包含 `.github/workflows/deploy-pages.yml`。推送到 `codex/twilight-cocktail-prototype`、`main` 或 `master` 后会自动构建并发布 `gh-pages` 分支。也可以手动把 `frontend/dist` 推送到 `gh-pages`。

## 当前限制

- “我的作品”、收藏、酒柜和课程进度当前主要保存在浏览器本地，换设备需要后续接入账号和云同步。
- 部分无可靠来源的酒款仍使用兜底制作步骤。
- 图片授权、来源 URL、校对时间和审核状态还可以继续精细化。
