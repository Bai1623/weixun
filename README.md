# 暮调 Twilight Mixbook

每晚一杯的私人调酒手账。

暮调是一款面向日常调酒爱好者的 Web/PWA 应用：你可以浏览经典与中文网红酒单，按家中原料筛选能做的酒，每天随机抽一杯，也可以把自己每天调过的作品、照片、原料和复盘记录下来。

线上体验：

- https://bai1623.github.io/weixun/

项目源码在：

- `twilight-cocktail/`

## 核心功能

- 420 款酒单数据，包含经典鸡尾酒和中文网红特调。
- 每日酒单：用轻量星图动画随机推荐今晚的一杯。
- 酒谱详情：图片、风味、配料、制作步骤和制作模式。
- 我的酒柜：登记已有原料，筛选可以直接制作或只差一种材料的酒。
- 调酒学院：记录入门课程进度。
- 我的作品：记录每天调过的酒、照片、原材料、评分、自评和备注。
- 本地优先：收藏、酒柜、课程进度、每日选择和作品记录都可在浏览器本地保存。

## 本地运行

```bash
cd "twilight-cocktail/frontend"
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

打开：

- http://127.0.0.1:5173/

## 验证

```bash
cd "twilight-cocktail/frontend"
npm run test -- --run
npm run lint
npm run build:pages
```

更多工程说明见 [twilight-cocktail/README.md](twilight-cocktail/README.md)。
