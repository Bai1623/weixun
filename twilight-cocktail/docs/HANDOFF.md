# Twilight Mixbook Handoff

更新日期：2026-08-15

## 项目是什么

项目名：暮调 Twilight Mixbook

一句话介绍：A private mixology journal for one drink every evening.

暮调是一个私人调酒手账 Web/PWA。核心用途是：浏览酒谱、根据酒柜筛选能做的酒、每日随机推荐一杯、学习调酒基础、记录每天调过的作品，并把账号级数据同步到腾讯云 CloudBase。

## 当前版本

- 当前代码仓库：`git@github.com:Bai1623/weixun.git`
- 当前工作分支：`codex/twilight-cocktail-prototype`
- 当前最新代码 commit：`ff28711 feat: sync account metadata incrementally`
- 当前 Pages 仓库：`git@github.com:Bai1623/weixun-Twilight-Mixbook.git`
- 当前 Pages 分支：`gh-pages`
- 最近确认的 Pages 分支 commit：`283fd6b`
- 线上地址：[https://bai1623.github.io/weixun-Twilight-Mixbook/](https://bai1623.github.io/weixun-Twilight-Mixbook/)
- 带缓存刷新参数的作品页：[https://bai1623.github.io/weixun-Twilight-Mixbook/?v=ff28711#/works](https://bai1623.github.io/weixun-Twilight-Mixbook/?v=ff28711#/works)

## 目录说明

```text
twilight-cocktail/
├── frontend/                 # 当前主要在用的 Vue 3 前端
│   ├── src/pages/            # 页面：首页、每日酒单、酒谱、酒柜、我的作品等
│   ├── src/stores/           # Pinia 状态，很多本地数据在这里读写 localStorage
│   ├── src/services/         # CloudBase HTTP 云函数调用
│   ├── src/data/             # 酒单数据，当前 generated catalog 为 420 条
│   └── public/cocktails/     # 部分酒款图片素材
├── cloudbase/twilightWorks/  # 腾讯云 CloudBase 云函数
├── backend/                  # FastAPI 后端骨架，当前线上静态站点主要不依赖它
├── docker-compose.yml        # 可选完整本地环境
└── docs/HANDOFF.md           # 本交接文档
```

## 主要功能状态

- 酒谱：当前 `frontend/src/data/cocktails.generated.json` 有 420 条酒款。
- 中文网红特调：`frontend/src/data/chinese-trend-cocktails.json` 有 80 条，例如想见你、冰岛、占有欲。
- 每日酒单：星图/关键词动画随机推荐，支持“再摇一杯”。
- 我的酒柜：本地记录已有原料，用来筛选可制作酒款。
- 调酒学院：本地记录课程进度。
- 我的作品：记录日期、酒单、照片、基酒/调味酒/饮料/其他、评分、心情、自我评价、备注。
- 我的作品分享：支持 JSON 导入导出、长图导出、筛选导出。
- 朋友想喝：生成分享链接后，朋友可提交一条无照片点单；你在“我的作品”里查看、删除。
- CloudBase 同步：当前是账号级轻量增量同步，覆盖作品文字信息、酒柜、收藏、学院进度、每日酒单、自定义选项和自动备份状态。

## 云端同步现状

CloudBase 环境：

- 环境 ID：`weixun-d8g9xwqak83952747`
- 云函数名：`twilightWorks`
- HTTP 云函数地址：`https://weixun-d8g9xwqak83952747-1462034992.ap-shanghai.app.tcloudbase.com/twilightWorks`
- 文档型数据库集合：`works`

当前同步逻辑：

- 前端不再直接使用 CloudBase 匿名登录。
- 用户在“我的作品”里输入云端账号和密码，这是一套应用自己的轻量账号逻辑，不是腾讯云账号。
- 登录/创建账号、上传、恢复、朋友点单都通过 `twilightWorks` HTTP 云函数。
- 最新版本上传使用 `metadata-patch`：第一次同步全部轻量元数据，之后只同步新增/编辑/删除过的作品元数据。
- 照片不会进入轻量同步包。原因是 base64 图片会让请求非常大，之前上传和恢复会变慢或失败。
- 同一台电脑从云端恢复时，如果云端记录没有照片，本地已有照片会被保留。
- 换电脑恢复时，作品文字、原料、评分等能恢复；作品照片暂时不会跨设备恢复。

后续如果要彻底解决照片跨设备问题，下一步应做 CloudBase 云存储：照片上传到 Storage，数据库只存图片 URL 或 fileId。

## 新电脑怎么跑

先准备：

- Node.js：建议 20+ 或 22+
- npm：跟 Node 一起安装即可
- 可选 Python：3.12，用于后端
- 可选 Docker Desktop：用于完整后端/Postgres 环境

拉代码：

```bash
git clone git@github.com:Bai1623/weixun.git
cd weixun
git checkout codex/twilight-cocktail-prototype
git pull origin codex/twilight-cocktail-prototype
```

只跑当前主要使用的前端：

```bash
cd twilight-cocktail/frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

打开：

- [http://127.0.0.1:5173/](http://127.0.0.1:5173/)
- 如果 5173 被占用，换端口，例如：

```bash
npm run dev -- --host 127.0.0.1 --port 5180
```

完整 Docker 环境：

```bash
cd twilight-cocktail
cp .env.example .env
docker compose up --build
```

访问：

- 前端：[http://localhost:5173](http://localhost:5173)
- 后端健康检查：[http://localhost:8000/health](http://localhost:8000/health)
- Swagger：[http://localhost:8000/docs](http://localhost:8000/docs)

## 常用开发命令

前端：

```bash
cd twilight-cocktail/frontend
npm run test -- --run
npm run lint
npm run build:pages
```

云函数本地单测：

```bash
cd twilight-cocktail/cloudbase/twilightWorks
node --test index.test.cjs
```

重新生成酒单 catalog：

```bash
cd twilight-cocktail/frontend
npm run catalog:build
```

后端可选验证：

```bash
cd twilight-cocktail/backend
python3.12 -m venv .venv
.venv/bin/python -m pip install -e ".[dev]"
.venv/bin/python -m pytest -q
.venv/bin/ruff check .
.venv/bin/mypy app tests
```

## CloudBase 云函数怎么更新

如果改了 `cloudbase/twilightWorks/index.js`，必须重新部署云函数，否则线上会继续跑旧逻辑。

控制台手动部署时：

1. 打开腾讯云 CloudBase 控制台。
2. 进入环境 `weixun-d8g9xwqak83952747`。
3. 进入云函数/托管，找到 `twilightWorks`。
4. 用本地 `twilight-cocktail/cloudbase/twilightWorks/index.js` 覆盖线上 `index.js`。
5. 确认依赖包含 `@cloudbase/node-sdk`，参考 `package.json`。
6. 部署后打开“我的作品”，登录云端账号，测试“上传到云端”和“从云端恢复”。

如果前端提示“云函数不支持轻量同步”或“无法连接云函数”，优先检查：

- `twilightWorks` 是否部署的是最新代码。
- HTTP 网关/默认域名是否能访问。
- 数据库集合 `works` 是否存在。
- 云函数是否能读写当前环境数据库。

## 线上怎么发布

当前 `twilight-cocktail/.github/workflows` 是空目录，不能依赖 GitHub Actions 自动发布。

现在的发布方式是手动构建后，把 `frontend/dist` 推到 Pages 仓库 `Bai1623/weixun-Twilight-Mixbook.git` 的 `gh-pages` 分支：

```bash
cd twilight-cocktail/frontend
npm run build:pages

TMP_DIR=$(mktemp -d /tmp/twilight-pages.XXXXXX)
git clone --depth 1 --branch gh-pages git@github.com:Bai1623/weixun-Twilight-Mixbook.git "$TMP_DIR"
rsync -a --delete --exclude .git dist/ "$TMP_DIR"/
touch "$TMP_DIR/.nojekyll"
git -C "$TMP_DIR" add -A
git -C "$TMP_DIR" commit -m "deploy github pages"
git -C "$TMP_DIR" push origin gh-pages
```

如果 `git diff --cached --quiet` 显示没有变化，就说明线上构建产物已经一致，不需要推。

## 迁移数据建议

如果只是换电脑继续开发：

- 代码用 Git 迁移。
- 本地个人数据不在代码里，浏览器 localStorage 不会跟着 Git 走。
- 推荐在旧电脑先打开“我的作品”，登录云端账号，点击“上传到云端”。
- 新电脑打开线上或本地站点后，用同一个云端账号登录，点击“从云端恢复”。
- 作品照片暂时不能通过云端跨设备恢复。需要照片的话，用 JSON 导出或手动备份浏览器数据，但这不是长期方案。

如果要给朋友使用：

- 直接发线上地址。
- “朋友想喝”需要你先登录云端账号并生成分享链接。
- 分享链接可关闭或重置。
- 朋友点单不支持照片，字段长度也有限制，这是为了避免滥用和请求体过大。

## 已知问题和下一步

优先级较高：

- 做 CloudBase Storage 照片上传，让作品照片能跨设备恢复。
- 给 GitHub Pages 增加真正的 GitHub Actions 自动部署，减少手动 `rsync`。
- README 里部分 CloudBase 描述已落后于当前实现，后续应同步更新。

优先级中等：

- 构建时有 chunk 大小提示，主要来自大酒单/详情数据，后续可拆分数据或做懒加载。
- CloudBase 当前是单集合 `works` 存账号、备份和点单数据，个人使用够用；多人正式使用前要重新设计权限和数据模型。
- 本地 localStorage 仍是页面即时缓存，云端是账号备份源。未来可改成云端主数据源。

## 给 Codex 的接手提示

新电脑上打开 Codex 后，可以这样开始：

```text
项目在 weixun/twilight-cocktail，先读 docs/HANDOFF.md，然后基于 codex/twilight-cocktail-prototype 分支继续。
不要动根目录里和 twilight-cocktail 无关的历史脏文件。
当前重点是暮调 Twilight Mixbook 的前端、CloudBase 同步和 GitHub Pages 发布。
```

常见验证组合：

```bash
cd twilight-cocktail/frontend
npm run test -- --run
npm run lint
npm run build:pages

cd ../cloudbase/twilightWorks
node --test index.test.cjs
```
