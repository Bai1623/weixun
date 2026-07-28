# 暮色酒单首轮软件设计

日期：2026-07-28

关联 PRD：`/Users/a221209/Documents/New project/暮色酒单_完整PRD_页面原型_SQL_Codex提示词.md`

## 目标

本轮先完成“暮色酒单”第一阶段和第二阶段：新建一个可运行的独立 Web/PWA 工程原型，建立前后端工程骨架，并用本地 Mock 数据实现核心页面体验。

本轮交付不是最终完整 MVP。最终 MVP 仍需要真实数据库、持久化每日推荐、酒柜匹配、收藏、学院进度、后端测试、前端测试、E2E 和 PWA 完整验收。本轮设计必须为这些后续能力预留清晰边界，避免一次性静态页面。

## 项目位置

新项目放在：

```text
/Users/a221209/Documents/New project/twilight-cocktail/
```

原因：

- 当前工作目录是一个混合型仓库，已有多个无关输出包和未提交文件。
- 独立目录能降低对现有文件的影响。
- 后续可单独运行、测试、打包和部署。

## 方案选择

采用“首轮可运行原型”方案。

对比：

- 完整 MVP 一次做完：目标最完整，但实现和验证面太大，不适合作为第一步。
- 只做静态前端：最快看到视觉，但偏离 PRD 对真实后端和数据库的最终要求。
- 首轮可运行原型：先完成可操作页面和工程骨架，同时保留真实 API、数据库和测试的升级路径。

## 技术架构

### 前端

使用：

- Vue 3
- TypeScript
- Vite
- Vue Router
- Pinia
- Tailwind CSS
- Axios
- ECharts
- Motion for Vue
- Vite PWA 插件
- Vitest
- Playwright
- ESLint
- Prettier

前端按真实应用组织目录：

```text
frontend/src/
├── api/
├── assets/
├── components/
│   ├── common/
│   ├── cocktail/
│   ├── daily/
│   ├── pantry/
│   └── academy/
├── composables/
├── data/
├── layouts/
├── pages/
├── router/
├── stores/
├── styles/
├── types/
└── utils/
```

Mock 数据只作为阶段性数据源。页面、store 和 API client 的命名按照真实后端接口设计，下一阶段从 Mock 切到 FastAPI 时不需要重写页面结构。

### 后端

使用 FastAPI 建立骨架：

```text
backend/app/
├── main.py
├── api/
│   └── v1/
├── core/
├── schemas/
├── services/
├── repositories/
└── tests/
```

本轮后端至少提供：

- `/health` 健康检查。
- `/docs` Swagger 页面。
- 清晰的 app 初始化结构。
- 未来业务模块目录。

本轮不实现完整业务持久化，但不把后续业务逻辑写死在前端组件里。

### 运行环境

根目录包含：

```text
docker-compose.yml
.env.example
README.md
```

`docker compose up --build` 应能启动：

- `frontend`
- `backend`
- `postgres`

PostgreSQL 在本轮主要用于验证环境结构，真实模型和迁移留到下一阶段。

## 页面范围

本轮实现以下路由：

```text
/
/home
/daily
/daily/result
/cocktails
/cocktails/:slug
/cocktails/:slug/make
/academy
/pantry
/profile
```

移动端底部导航固定为五项：

```text
首页 / 每日 / 酒谱 / 酒柜 / 我的
```

桌面端使用顶部导航，并保持同样信息结构。

## 页面设计

### 首页

目标是在三秒内建立精品酒吧菜单感，并引导用户进入今日酒单。

内容：

- 品牌名“暮色酒单 / Twilight Cocktail”。
- Hero 文案：“今晚，调一杯属于你的味道。”
- 主按钮“开启今日酒单”。
- 次按钮“查看经典酒谱”。
- 今日推荐预览。
- 四个快捷入口：我有什么酒、从零开始学习、发现经典、无酒精特调。
- 入门学习进度。
- 理性饮酒提示。

Hero 使用真实鸡尾酒照片风格的 CSS 渐变占位或远程公开图片占位。图片失败时显示高质量深色占位，而不是空白。

### 每日调酒轮盘

目标是提供有仪式感但克制的每日选择。

本轮规则：

- 候选池来自 Mock 数据中的热门经典酒。
- 点击“开始选择”后轮盘旋转并减速。
- 动画结束后显示选中酒款。
- 最终停靠项必须与选中数据一致。
- 使用 `localStorage` 以日期固定结果，刷新后同一天不改变。
- 支持减少动画模式。

下一阶段迁移：

- 同日固定结果由 FastAPI 和 `daily_picks` 表保证。
- `user_id + pick_date` 唯一约束保证并发幂等。

### 今日推荐结果

显示：

- 中英文名。
- 图片或占位图。
- 一句话风味。
- 难度、时间、酒精强度。
- 推荐理由。
- 查看配方。
- 开始制作。

### 酒谱列表

本轮支持前端筛选：

- 关键词。
- 基酒。
- 难度。
- 酒精强度。
- 是否无酒精。

排序：

- 热门优先。
- 入门优先。
- 材料最少。
- 制作最快。

筛选状态同步到 URL 查询参数。刷新页面后状态保留。

### 酒谱详情

显示：

- 主视觉。
- 中英文名。
- 简介。
- 核心信息：难度、时间、调制方式、杯型、酒精强度、材料数量。
- 五维风味图。
- 配料列表。
- 制作步骤。
- 初学者提示。
- 酒款故事。
- 数据来源。
- 理性饮酒提示。

配料按 `displayOrder` 展示。缺图时页面仍完整可用。

### 沉浸式制作模式

目标是手机竖屏可单手操作。

规则：

- 一屏只显示一步。
- 显示 `步骤 n / total`。
- 主按钮高度不低于 48px。
- 支持上一步、完成本步、退出。
- 当前步骤保存在 `localStorage`。
- 刷新后恢复进度。
- 完成后回到酒谱详情。

### 调酒学院

本轮显示 8 个入门课程卡片：

1. 认识鸡尾酒。
2. 六大基酒。
3. 常见工具。
4. 基础技法。
5. 味觉平衡。
6. 冰块与温度。
7. 杯型与装饰。
8. 第一条练习路线。

课程完成状态先用本地状态保存，下一阶段接学习进度 API。

### 我的酒柜

本轮实现基础页面：

- 原料搜索。
- 点击添加常见材料。
- 显示已拥有材料。
- 根据 Mock 配方计算“可以制作”和“只差一种”分组。
- 空酒柜显示引导。

本轮只在前端完成匹配演示，算法结构和字段命名对齐后端设计。

### 我的

本轮显示：

- 匿名用户标识。
- 收藏数量。
- 最近浏览入口。
- 今日酒单历史占位。
- 酒柜材料数量。
- 数据来源说明。
- 清除本地数据。

## Mock 数据设计

至少包含 12 款经典酒：

- Mojito
- Margarita
- Negroni
- Old Fashioned
- Whiskey Sour
- Daiquiri
- Gin Tonic
- Tom Collins
- Cosmopolitan
- Moscow Mule
- Aperol Spritz
- Cuba Libre

每款字段：

```ts
type Cocktail = {
  id: string
  slug: string
  nameZh: string
  nameEn: string
  shortDescription: string
  story: string
  imageUrl: string
  baseSpirit: string
  glassType: string
  method: string
  difficulty: 'easy' | 'medium' | 'advanced'
  prepMinutes: number
  alcoholLevel: 'none' | 'low' | 'medium' | 'high'
  flavors: {
    sweet: number
    sour: number
    bitter: number
    strong: number
    fresh: number
  }
  tags: string[]
  popularityWeight: number
  beginnerFriendly: boolean
  isIba: boolean
  isAlcoholic: boolean
  sourceName: string
  ingredients: CocktailIngredient[]
  steps: CocktailStep[]
}
```

图片可以先使用稳定远程图片 URL 或本地 CSS 占位。所有图片必须有失败占位和 `alt`。

## 状态管理

Pinia store：

- `useUserStore`
- `useDailyPickStore`
- `useCocktailStore`
- `usePantryStore`
- `useFavoriteStore`
- `useAcademyStore`
- `useAppSettingStore`

LocalStorage：

- `anonymous_user_key`
- `theme`
- `reduced_motion`
- `daily_pick_date`
- `daily_pick_slug`
- `current_make_progress`
- `favorite_cocktail_slugs`
- `pantry_ingredient_slugs`
- `academy_progress`

不在 LocalStorage 保存敏感数据。

## API 边界

前端 API client 先暴露与 PRD 一致的方法：

- `getDailyPick()`
- `getCocktails(params)`
- `getCocktail(slug)`
- `getPantry()`
- `getPantryMatches()`
- `getFavorites()`
- `getAcademyLessons()`

本轮这些方法可以从 Mock adapter 返回数据。下一阶段替换为 Axios 请求真实后端。

## 视觉系统

沿用 PRD 色彩，但控制一色化问题：

- 背景：曜石黑、深咖啡。
- 文字：奶油白、柔和灰。
- 强调：香槟金。
- 状态辅助：酒红、橄榄绿、琥珀。

字体：

- 标题：`Playfair Display` 或可公开加载的中文衬线备选。
- 正文：`Inter` 或系统无衬线。

交互：

- 按钮和卡片有清晰 hover / focus 状态。
- 动画 150 至 300ms 为主。
- 轮盘动画可以 2.5 至 4 秒。
- 尊重 `prefers-reduced-motion`。
- 不使用廉价霓虹、大面积紫蓝渐变、粒子特效或后台管理样式。

布局：

- 390px 手机无横向滚动。
- 1440px 桌面首屏完整。
- 卡片圆角不超过 8px，除非是沉浸视觉图片区。
- 不把页面 section 做成层层嵌套卡片。

## 错误、加载和空状态

所有主要页面有：

- 加载状态。
- 空状态。
- 错误状态。
- 重试按钮。
- 图片加载失败占位。

Mock 阶段也要实现这些组件，避免后续接 API 时页面崩坏。

## 测试与验证

本轮验证：

- 前端 `npm run build`。
- 前端基础测试 `npm run test`。
- 前端 lint。
- 后端 `pytest`。
- 后端 `ruff check`。
- Docker Compose 配置可解析并能启动基础服务。
- 本地 dev server 可打开应用。

页面检查：

- 390px 宽度。
- 1440px 宽度。
- 首页无横向滚动。
- 轮盘结果稳定。
- 酒谱详情在缺图时仍可用。
- 制作模式刷新后恢复当前步骤。

## 后续阶段

第三阶段实现真实后端与数据库：

- SQLAlchemy 模型。
- Alembic 首个迁移。
- 20 款经典酒和 5 款无酒精特调种子数据。
- 匿名用户接口。
- 酒谱列表、筛选、详情接口。
- 每日推荐接口和幂等。
- 收藏和最近浏览接口。
- 前端切换真实 API。

第四阶段实现酒柜与学院：

- 原料搜索。
- 酒柜增删改查。
- 酒柜匹配算法。
- 课程详情和学习进度。

最终质量阶段：

- P0 功能完整审计。
- 响应式审计。
- 前端、后端、E2E 全量测试。
- PWA 安装验证。
- README 和部署说明完善。

## 明确不做

本轮不做：

- 用户登录。
- 真实数据库模型和迁移。
- 真实持久化每日推荐。
- AI 调酒师。
- 拍照识别。
- 购物清单。
- 品鉴记录。
- 管理后台。
- 大规模第三方数据同步。

这些能力已保留在后续阶段，不进入首轮实现范围。

