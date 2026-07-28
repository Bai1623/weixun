# 暮色酒单 Twilight Cocktail

暮色酒单是一款面向调酒初学者和轻度爱好者的响应式 Web/PWA 原型。当前版本完成 PRD 的第一至第三阶段主链路：工程骨架、暗色高级视觉系统、核心页面、SQLAlchemy 数据模型、种子数据、匿名用户、酒谱、每日推荐、收藏和浏览历史 API。

## 当前范围

已实现：

- Vue 3 + TypeScript + Vite 前端。
- FastAPI 后端、Swagger 和 `/api/v1` 核心接口。
- Docker Compose：frontend、backend、postgres。
- 25 款酒谱种子数据：20 款经典酒 + 5 款无酒精特调。
- 8 节调酒学院课程。
- 首页、每日轮盘、今日结果、酒谱列表、详情、制作模式、学院、酒柜、我的。
- 后端同用户同日期幂等每日推荐，前端离线时回落本地推荐。
- 匿名用户、收藏、最近浏览 API。
- 酒柜 `可以直接制作 / 只差一种 / 材料不足` 基础匹配。
- SQLAlchemy 模型、SQLite/PostgreSQL 兼容连接配置和 Alembic 基线迁移。
- 56 张本地真实酒款照片，覆盖核心经典和流行酒款。
- Vitest 单元测试、Pytest API 测试、Ruff 和 Mypy。

未完成但已预留：

- 后端酒柜、学院、搜索联想、用户偏好和管理审核 API。
- 真实图片资源、来源许可字段精细化和配方二次校对流程。
- 完整 E2E、PWA 安装验收、生产部署和监控。

## 技术栈

前端：Vue 3、TypeScript、Vite、Vue Router、Pinia、Tailwind CSS、Axios、ECharts、Vite PWA、Vitest、Playwright。

后端：FastAPI、Pydantic、SQLAlchemy、Alembic、PostgreSQL/SQLite、Pytest、Ruff、Mypy。Docker 使用 Python 3.12。

## 目录结构

```text
twilight-cocktail/
├── docker-compose.yml
├── .env.example
├── frontend/
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
    │   ├── api/
    │   ├── core/
    │   ├── data/
    │   ├── db/
    │   ├── repositories/
    │   ├── schemas/
    │   ├── services/
    │   └── main.py
    ├── alembic/
    └── tests/
```

## 本地启动

```bash
cp .env.example .env
docker compose up --build
```

访问：

- 前端：http://localhost:5173
- 后端健康检查：http://localhost:8000/health
- Swagger：http://localhost:8000/docs

也可以本地开发启动：

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

```bash
cd backend
/path/to/python3.12 -m venv .venv
.venv/bin/python -m pip install -e ".[dev]"
.venv/bin/uvicorn app.main:app --reload
```

默认本地后端会创建 `backend/twilight.db` 并导入种子数据。要连接 PostgreSQL，可设置：

```bash
export DATABASE_URL="postgresql+psycopg://twilight:twilight@localhost:5432/twilight"
```

数据库迁移：

```bash
cd backend
.venv/bin/alembic upgrade head
```

核心 API：

- `POST /api/v1/users/anonymous`
- `GET /api/v1/cocktails`
- `GET /api/v1/cocktails/{slug}`
- `GET /api/v1/daily-pick`
- `GET /api/v1/favorites`
- `POST /api/v1/favorites/{slug}`
- `DELETE /api/v1/favorites/{slug}`
- `GET /api/v1/history/cocktails`
- `POST /api/v1/history/cocktails/{slug}`

## 验证命令

前端：

```bash
cd frontend
npm run test -- --run
npm run lint
npm run build
```

后端：

```bash
cd backend
.venv/bin/python -m pytest -q
.venv/bin/ruff check .
.venv/bin/mypy app tests
.venv/bin/alembic upgrade head
```

Docker 配置：

```bash
docker compose config
```

## 设计决策

- 当前工作目录包含多个无关项目和输出包，因此新建独立 `twilight-cocktail/` 目录。
- 前端优先读取真实 API；API 不可用时回落本地 Mock 数据，保证原型可离线演示。
- 每日推荐以 `daily_picks` 持久化，按 `user_id + pick_date` 保持同日幂等。
- 视觉避免后台系统风格，采用曜石黑、深咖啡、香槟金、奶油白和少量酒红。
- 图片阶段性使用 CSS 鸡尾酒视觉占位，并提供清晰文本和失败可用页面结构；后续数据阶段替换为带来源字段的授权图片。

## 数据来源

当前配方为本地审核种子数据，用于产品原型和交互验证。酒款照片来自 TheCocktailDB 公共 API 的 `strDrinkThumb` 字段，并已保存到 `frontend/public/cocktails/` 供本地稳定展示。下一阶段会为每条真实种子数据补充更细的来源 URL、许可、校对时间和审核状态。

## 下一阶段

1. 实现酒柜、学院、偏好和审核后台 API。
2. 引入真实授权图片和配方来源详情。
3. 补齐 Playwright E2E 主链路和 PWA 安装验收。
4. 接入生产环境配置、部署和基础监控。
