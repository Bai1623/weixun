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
- **跨设备同步**：作品和账号数据保存到腾讯云 CloudBase，原图与预览图保存到私有阿里云 OSS；新设备登录后会自动恢复全部作品预览图。
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

当前仓库还没有可用的 GitHub Actions 发布工作流。运行 `npm run build:pages` 后，需要按 `docs/HANDOFF.md` 的步骤把 `frontend/dist` 手动发布到 Pages 仓库的 `gh-pages` 分支。

## 照片云备份

作品照片采用双文件备份：手机原图保持原文件上传，另生成最长边 1280px、JPEG 质量 0.82 的预览图。单张原图上限 50 MB。浏览器只把二进制缓存放在 IndexedDB；CloudBase 数据库只保存 OSS 对象键，不保存 AccessKey、签名 URL 或 Base64 图片。

部署 `cloudbase/twilightWorks` 时必须同时上传 `index.js`、`ossPhotos.js`、`package.json`，安装依赖，并在 CloudBase 云函数控制台配置以下环境变量：

```text
ALIBABA_CLOUD_ACCESS_KEY_ID=<RAM 用户 AccessKey ID>
ALIBABA_CLOUD_ACCESS_KEY_SECRET=<RAM 用户 AccessKey Secret>
ALIYUN_OSS_REGION=oss-cn-hangzhou
ALIYUN_OSS_BUCKET=twilight-cocktail-bai
ALIYUN_OSS_PREFIX=photos
```

真实 AccessKey 只能保存在 CloudBase 环境变量中，不能写进前端、Git 或 `.env.example`。RAM 用户只应拥有 `twilight-cocktail-bai/photos/*` 的 GetObject、PutObject 和 DeleteObject 权限。OSS Bucket 保持私有；浏览器通过云函数返回的 15 分钟签名 URL 上传和下载。

Bucket CORS 至少允许线上 Pages 域名以及本地 `http://127.0.0.1:5173`、`http://localhost:5173`，方法为 GET、PUT、HEAD，请求头为 `*`，暴露 `ETag` 与 `x-oss-request-id`。

部署后按以下顺序验收：登录账号，新增带照片作品并上传；在 OSS 的 `photos/<账号哈希>/<作品 ID>/<照片版本>/` 下确认原图和 `preview.jpg`；再用无本地数据的浏览器登录，确认作品元数据和全部预览图自动恢复，最后点击作品卡片的下载按钮检查原图。

## 当前限制

- 新设备登录会自动下载全部作品预览图；原图为避免流量和空间浪费，只在用户点击时下载。
- 旧版本只保存过压缩 Base64 图片的作品会迁移为“仅预览”备份，无法还原当时未保存的手机原图。
- 部分无可靠来源的酒款仍使用兜底制作步骤。
- 图片授权、来源 URL、校对时间和审核状态还可以继续精细化。
