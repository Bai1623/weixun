# Twilight Mixbook Handoff

更新日期：2026-08-22

## 项目是什么

项目名：暮调 Twilight Mixbook

一句话介绍：A private mixology journal for one drink every evening.

暮调是一个私人调酒手账 Web/PWA。核心用途是：浏览酒谱、根据酒柜筛选能做的酒、每日随机推荐一杯、学习调酒基础、记录每天调过的作品，并把账号级数据同步到腾讯云 CloudBase。

## 当前版本

- 当前代码仓库：`git@github.com:Bai1623/weixun-Twilight-Mixbook.git`（旧 `weixun.git` 会跳转到此仓库）
- 当前开发分支：`codex/twilight-cocktail-prototype`
- 最近确认的源码 commit：`b806223`
- 当前 Pages 仓库：`git@github.com:Bai1623/weixun-Twilight-Mixbook.git`
- 当前 Pages 分支：`gh-pages`
- 最近确认的 Pages 分支 commit：`b19ec7c`
- 线上地址：[https://bai1623.github.io/weixun-Twilight-Mixbook/](https://bai1623.github.io/weixun-Twilight-Mixbook/)
- 带缓存刷新参数的作品页：[https://bai1623.github.io/weixun-Twilight-Mixbook/?v=b806223#/works](https://bai1623.github.io/weixun-Twilight-Mixbook/?v=b806223#/works)

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
- 朋友想喝：生成分享链接后，朋友可提交一条无照片点单；列表默认折叠，可展开、删除；关闭链接会在确认后清空该链接下全部点单。
- 跨设备同步：账号级轻量增量元数据保存在 CloudBase；作品手机原图和 1280px 预览图保存在私有阿里云 OSS。

## 云端同步现状

CloudBase 环境：

- 环境 ID：`bai-d0g23uiiz96a4f50d`
- `/share` 当前路由函数：`scfnodejshelloworld11`
- HTTP 云函数地址：`https://bai-d0g23uiiz96a4f50d-1428838698.ap-shanghai.app.tcloudbase.com/share`
- 文档型数据库集合：`bai`

当前同步逻辑：

- 前端不再直接使用 CloudBase 匿名登录。
- 用户在“我的作品”里输入云端账号和密码，这是一套应用自己的轻量账号逻辑，不是腾讯云账号。
- 登录/创建账号、上传、恢复、朋友点单都通过 `/share` HTTP 云函数路由。
- 登录或切换账号会先读取目标账号摘要并请求确认；确认后以云端为准，整包替换本机的作品和照片、酒柜、收藏、课程进度、每日推荐、自定义材料及自动备份设置。取消时本机数据不变。
- 最新版本上传使用 `metadata-patch`：第一次同步全部轻量元数据，之后只同步新增/编辑/删除过的作品元数据。
- 照片二进制不会进入轻量同步包。数据库只保存 OSS 对象键；浏览器使用云函数签发的短期 PUT/GET URL 直传 OSS。
- 新增照片先写入本机 IndexedDB，再由一次统一云同步上传；照片签名和轻量元数据遇到临时网络错误会重试一次。云端仍失败时作品保留在本机并提示稍后手动上传。
- 同一台电脑从云端恢复时，如果云端记录没有照片，本地已有照片会被保留。
- 新电脑无本地作品时，登录后会自动恢复账号数据，并默认下载全部作品预览图；支持进度、暂停、继续和失败重试。
- 手机原图不会批量自动下载，在作品卡片上按需下载。
- IndexedDB 保存本地照片 Blob；带云端照片版本的记录不会再把 Base64 图片写入 localStorage。
- 旧版 Base64 照片会在下次云端同步时迁移为“仅预览”备份，无法补回原始手机文件。

阿里云 OSS：

- Bucket：`twilight-cocktail-bai`
- Region：`oss-cn-hangzhou`
- 对象前缀：`photos`
- 对象格式：`photos/<账号哈希>/<作品 ID>/<照片版本>/original.<扩展名>` 和 `preview.jpg`
- RAM 策略仅允许该 Bucket 的 `photos/*` GetObject、PutObject、DeleteObject。

## 新电脑怎么跑

先准备：

- Node.js：建议 20+ 或 22+
- npm：跟 Node 一起安装即可
- 可选 Python：3.12，用于后端
- 可选 Docker Desktop：用于完整后端/Postgres 环境

拉代码：

```bash
git clone git@github.com:Bai1623/weixun-Twilight-Mixbook.git
cd weixun-Twilight-Mixbook
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
2. 进入环境 `bai-d0g23uiiz96a4f50d`。
3. 进入云函数/托管，找到 `/share` 路由对应的 `scfnodejshelloworld11`。
4. 上传整个 `twilight-cocktail/cloudbase/twilightWorks`，至少包含 `index.js`、`ossPhotos.js` 和 `package.json`，不能只覆盖 `index.js`。
5. 安装 `package.json` 中的 `@cloudbase/node-sdk` 和 `ali-oss` 依赖。
6. 在云函数环境变量中配置 `ALIBABA_CLOUD_ACCESS_KEY_ID`、`ALIBABA_CLOUD_ACCESS_KEY_SECRET`、`ALIYUN_OSS_REGION=oss-cn-hangzhou`、`ALIYUN_OSS_BUCKET=twilight-cocktail-bai`、`ALIYUN_OSS_PREFIX=photos`。真实密钥不得进入 Git 或前端。
7. 部署后打开“我的作品”，登录云端账号，新增带照片作品并测试上传、跨浏览器自动恢复预览和按需下载原图。

已登录 CloudBase CLI 时也可在 `twilight-cocktail` 目录执行：

```bash
tcb -e bai-d0g23uiiz96a4f50d fn deploy scfnodejshelloworld11 \
  --dir cloudbase/twilightWorks --force --install-dependency true
```

如果前端提示“云函数不支持轻量同步”或“无法连接云函数”，优先检查：

- `scfnodejshelloworld11` 是否部署的是最新代码。
- HTTP 网关/默认域名是否能访问。
- 数据库集合 `bai` 是否存在。
- 云函数是否能读写当前环境数据库。
- 云函数是否已安装 `ali-oss`，以及五个 OSS 环境变量是否完整。
- RAM 用户是否仍有 `twilight-cocktail-bai/photos/*` 权限。
- OSS CORS 是否允许 Pages 域名、`127.0.0.1:5173` 和 `localhost:5173` 的 GET、PUT、HEAD。

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
- 新电脑打开线上或本地站点后，用同一个云端账号登录。无本地作品时会自动恢复全部账号数据和作品预览图，不再需要逐张选择。
- 等待“照片预览恢复”进度完成；失败项可重试。原图需要时从作品卡片单独下载。

如果要给朋友使用：

- 直接发线上地址。
- “朋友想喝”需要你先登录云端账号并生成分享链接。
- 分享链接可关闭或重置。
- 朋友点单不支持照片，字段长度也有限制，这是为了避免滥用和请求体过大。

## 已知问题和下一步

优先级较高：

- 在真实 CloudBase 与 OSS 环境完成一次端到端验收，并观察 100～200 张照片时的恢复流量和失败率。
- 给 GitHub Pages 增加真正的 GitHub Actions 自动部署，减少手动 `rsync`。

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
