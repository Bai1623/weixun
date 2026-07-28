# 暮色酒单 Twilight Cocktail

暮色酒单是一款面向调酒初学者和轻度爱好者的响应式 Web/PWA 原型。当前版本完成 PRD 的第一阶段和第二阶段：工程骨架、暗色高级视觉系统、Mock 数据页面、每日轮盘、酒谱、详情、制作模式、学院和酒柜基础匹配。

## 当前范围

已实现：

- Vue 3 + TypeScript + Vite 前端。
- FastAPI 后端骨架和 Swagger。
- Docker Compose：frontend、backend、postgres。
- 12 款经典鸡尾酒 Mock 数据。
- 8 节调酒学院课程。
- 首页、每日轮盘、今日结果、酒谱列表、详情、制作模式、学院、酒柜、我的。
- 本地同日固定每日推荐。
- 酒柜 `可以直接制作 / 只差一种 / 材料不足` 基础匹配。
- Vitest 单元测试和 Pytest 后端测试。

未完成但已预留：

- SQLAlchemy 模型和 Alembic 迁移。
- 真实 PostgreSQL 数据持久化。
- 后端每日推荐、收藏、最近浏览、酒柜和学院 API。
- 20 款经典酒 + 5 款无酒精特调种子数据。
- 完整 E2E、PWA 安装验收和生产部署。

## 技术栈

前端：Vue 3、TypeScript、Vite、Vue Router、Pinia、Tailwind CSS、Axios、ECharts、Vite PWA、Vitest、Playwright。

后端：FastAPI、Pydantic、Pytest、Ruff、Mypy。Docker 使用 Python 3.12。

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
    │   ├── schemas/
    │   └── main.py
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
```

Docker 配置：

```bash
docker compose config
```

## 设计决策

- 当前工作目录包含多个无关项目和输出包，因此新建独立 `twilight-cocktail/` 目录。
- 首轮使用 Mock 数据，但数据字段对齐未来数据库和 API。
- 每日推荐先用 localStorage 固定日期结果，后续迁移到后端 `daily_picks`。
- 视觉避免后台系统风格，采用曜石黑、深咖啡、香槟金、奶油白和少量酒红。
- 图片阶段性使用 CSS 鸡尾酒视觉占位，并提供清晰文本和失败可用页面结构；后续数据阶段替换为带来源字段的授权图片。

## 数据来源

当前配方为本地审核 Mock 数据，用于产品原型和交互验证。下一阶段会为每条真实种子数据补充来源、许可、校对时间和审核状态。

## 下一阶段

1. 建立 SQLAlchemy 模型和 Alembic 首个迁移。
2. 导入 20 款经典酒和 5 款无酒精特调。
3. 实现匿名用户、酒谱、每日推荐、收藏、最近浏览接口。
4. 前端从 Mock adapter 切换到真实 API。
5. 补齐后端单元测试、前端组件测试和 E2E 主链路。
