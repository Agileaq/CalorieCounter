# 仪表盘重构：复盘看板化（Dashboard Refocus）— 设计

- 日期：2026-09-06
- 状态：已与用户逐节确认（结构/数据/组件/边界/i18n 全部批准，含两条视觉防御细则）；**二轮修订已并入**：i18n 降级模板拆分、窗口日期纯数学、纤维余量口径
- 前置 spec：`2026-09-06-weight-tracking-design.md`（WeightTrendChart 语义，本设计沿用其锁定的口径）

## 1. 背景与目标

现状：仪表盘（`/`）由 5 张 StatCard 纵向平铺（卡路里/碳水/蛋白/脂肪/纤维），每张 = 半环仪表（当日剩余）+ Mon–Sun 柱 + 底部行，整页需滚动 4 屏以上；「当日进度」与「周度趋势」混在一处。目标页挂着体重趋势图但属于低频配置页。

目标：三 Tab 各司其职——

- **记录**（Log）：不动。唯一的高频输入与当日余量监控页（DaySummaryCard + 三餐 + 运动 + 体重卡）。
- **仪表盘**（Dashboard）：重构为中频复盘看板。移除全部单日环形仪表，自上而下三层：成果归因（体重+差额）→ 卡路里周趋势 → 营养素 2×2 矩阵。整页一屏~一屏半。
- **目标**（Goals）：移除体重图表，回归纯低频参数配置（预算/营养素/目标体重/计算器/数据）。

验收标准：①整页高度 ≈890px（一屏~一屏半）；②因果闭环——体重（果）与热量及四大营养素（因）同屏对齐，10 秒完成整周复盘。

## 2. Dashboard 模块规格（自上而下）

### 2.1 顶层：WeightTrendChart（迁移 + 新增结论行）

- 组件自 Goals 迁入 Dashboard，**组件本体除新增结论行外零改动**：范围切换器、readout、打卡散点、7 日均线、安全通道、事件泳道、缺口副图、图例、CTM 防镜像命中全部保留。
- **缺口副图口径维持食物推导**（`deficitSeries`：`(摄入 − 运动) − 当前预算`；负=低于预算=绿柱，正=超标=红柱）。用户已确认：结论数字必须等于可见柱子的加总，副图承担「因」的呈现，紧贴体重「果」，构成因果对齐。
- **新增结论行**（图例下方，`data-testid="trend-verdict"`）：
  - 文案（**双模板，杜绝残缺插值**）：默认走 `weight.weekReview` = `本周累计热量差额 {{kcal}} kcal · 体重{{dir}}`；`trendDirection=null`（均线方向不可判）时切换降级键 `weight.weekReviewDeficitOnly` = `本周累计热量差额 {{kcal}} kcal`——独立成句，**不渲染「· 体重」悬空分隔符**（不在单句模板里留空插值）。
  - 措辞用「热量差额」不用「缺口」：与柱色语义严格对齐（负=赤字绿），避免符号歧义；差额带符号显示（`−2,100` / `+1,300`），分组沿用 `en-US` 逗号。
  - 数据：`deficitWeekSummary`（以选中日为终点的 7 天窗口求和）+ `trendDirection`（均线方向）。
  - 显隐：`hasData=false`（窗口内无已记录天）或副图未展示（打卡 < 3）时整行隐藏；`trendDirection=null` 时整行保留但走降级模板（见上）。

### 2.2 中层：CalorieWeekCard（新）

- 标题行：`卡路里` + `周日均 {n} kcal`（无已记录天显示 `—`）。
- `WeekBars`：全宽 Mon–Sun 7 柱，`target = settings.dailyBudget`，超标柱顶红帽，预算虚线横贯柱区（层级见 §5.2），柱子可点选 → `setSelectedDate`。
- 周日均 = `weeklyStats.avg`（本周已记录天含选中日的均值）。

### 2.3 底层：MacroMatrix（新，2×2）

CSS Grid `2×2`，配置驱动：

| 格位 | 指标 | 判定方向 | 颜色 |
|---|---|---|---|
| 左上 | 碳水 `carbs.total` | 控上限（≤ 目标达标） | `var(--accent)` |
| 右上 | 蛋白 `protein` | 保底（≥ 目标达标） | `#5b3df5` |
| 左下 | 脂肪 `fat.total` | 控上限 | `#f5a623` |
| 右下 | 纤维 `carbs.fiber` | 控下限（阈值 = `settings.macroTargets.fiber`，30g 仅为示例） | `#34c0eb` |

每格内部（自上而下）：

1. **标题 + 余量/进度（按指标心智分口径）**：
   - 三大宏量（碳水/蛋白/脂肪）：带符号余量 `{{left}} / {{target}}g`，`left = target − 选中日摄入`。正 → `+22 / 128g`（默认色；碳水/脂肪=还剩额度，蛋白=还差多少），负 → `−15 / 250g` **红色**；选中日无记录 → `— / {{target}}g`。
   - 纤维（控下限，保底心智）：**不显示带符号余量**——不足时 `+18` 会被误读为「盈余」。改用已摄入口径 `{{intake}} / {{target}}g`（如 `12 / 30g`），达标 → **绿色**（如 `32 / 30g`），不足 → 浅警色（`var(--muted)`）；选中日无记录 → `— / {{target}}g`。
   - `target ≤ 0` → 两口径均显示 `—`。
2. **MiniBars 微型图**：7 根无坐标轴微型柱（规格见 §5.1），**逐日状态配色**——宏量当日超标 → 红，否则格色；纤维当日达标 → 绿，不足 → 浅色；`target ≤ 0` 时全部用格色（无逐日判定）。柱高 = `value / cellMax × 28px`（cellMax = 本周最大值，下限 1），0 值不渲染填充。**不可点选**（目标太小防误触，用户已确认）。
3. **底部结论行**（单行小字）：`周日均 {round(avg)}g · 达标 {hitDays}/7 天`；`avg=null` 或 `hitDays=null` 的段落显示 `—`。

## 3. 数据层（纯函数）

### 3.1 `weekly.ts`：`weeklySeries` → `weeklyStats`

签名：`weeklyStats(days, selected, metric, target, dir: 'max' | 'min')` → `{ bars, avg, hitDays }`

- `bars`：Mon–Sun `WeeklyBar[]`，同现有（未打开天按 `emptyDay` 取 0）。
- `avg`：本周**存在于 `days` 的天**（含选中日）的均值；「打开过但没吃」= 真实 0 计入；无已记录天 → `null`（不是 0，显示层出 `—`）。
- `hitDays`：`dir='max'` 时值 ≤ target 计达标，`dir='min'` 时值 ≥ target 计达标；仅统计存在天；`target ≤ 0` 或无存在天 → `null`。
- 唯一消费者是 Dashboard → 直接替换并迁移测试，无兼容层。

### 3.2 `weight.ts`：新增两个纯函数

- `deficitWeekSummary(days, selected, budget)` → `{ totalKcal: number; hasData: boolean }`
  - 窗口 = `[selected − 6, selected]` 闭区间 7 天；仅累加 `days` 中存在的日子（复用 `deficitSeries` 的逐日算法口径，窗口过滤）；无存在天 → `hasData=false, totalKcal=0`。
  - **日期纯数学（锁定）**：窗口日期键一律 `addDays(fromDateKey(selected), -i)`（i = 0..6）生成，与 weight.ts 顶部约定一致；**严禁 `new Date("YYYY-MM-DD")` 单参字符串构造**（UTC 隐式偏移/时区坑）。
- `trendDirection(s: Series, date: string)` → `'down' | 'stable' | 'up' | null`
  - 取该日 trend 与 7 天前 trend（`dailySeries.points` 按 `daysBetween` 定位）；任一缺失 → `null`；`Δ = trend(date) − trend(date−7)`；`|Δ| < 0.15` → `'stable'`，`Δ < 0` → `'down'`，否则 `'up'`。

## 4. 组件细节

### 4.1 `WeekBars.tsx`（新，共享柱状原语）

- Props：`bars: WeeklyBar[]`、`target: number`、`color: string`、`barHeight?`（默认 **64**，原 96）、`onBarClick?`。
- 渲染：Mon–Sun 胶囊柱（`fillParts` 的 under/over 封顶逻辑自 StatCard **原样抽取**）+ 星期标签（今日加粗）+ `target > 0` 时全宽预算虚线（几何位置 = 原分隔线所在的 `barHeight − UNDER' − 1` 比例位，UNDER 随 barHeight 等比缩放）+ 可选点选回调。
- 无环、无底部行——归消费者。RTL 行为沿用 flex 列序镜像（与原 StatCard 一致，不新增处理）。

### 4.2 `CalorieWeekCard.tsx`（新）

`标题行 + <WeekBars target={dailyBudget} onBarClick={setSelectedDate} />`。

### 4.3 `MacroMatrix.tsx`（新）

Grid 布局 + §2.3 配置数组；内部含 `MiniBars` 私有子组件（不导出，单文件自洽）。

### 4.4 `WeightTrendChart.tsx`（唯一改动）

图例 div 之后插入结论行；新增 `deficitWeekSummary` / `trendDirection` 的 `useMemo` 调用。其余（几何常量、命中、走廊）一律不动，现有 8 组测试的断言目标不受影响。

## 5. 视觉防御细节（用户补充，落盘强制）

### 5.1 MacroMatrix 窄屏防御

- 375pt 机型下单格内容宽 ≈160px。MiniBars：flex 行布局，`gap: 2px`，每柱 `flex: 1; max-width: 8px; min-width: 6px`，容器 `min-width: 0` 防网格撑破；7 柱总宽 ≤ 7×8+6×2 = 68px，无水平溢出。
- 格内文字行 `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` 防长余量串破格。

### 5.2 WeekBars 预算虚线层级

- 虚线为柱区容器的绝对定位兄弟节点（横贯全宽，`border-top: 1px dashed var(--muted)`）。
- 层级规则：**虚线在胶囊背景之上、在柱体填充与超标红帽之下**。实现：柱区容器 `position: relative`；虚线 `z-index: 1`；胶囊轨道不创建 stacking context（`position: relative` 且**不加** z-index/transform/opacity）；填充与红帽 `position: absolute; z-index: 2`。
- 效果：空柱段可见虚线（背景之上）；已填充柱段由填充层覆盖虚线，高亮/半透明反馈不被切断。

## 6. 高度预算（验收①）

| 模块 | 估算 |
|---|---|
| DateHeader | ~48px |
| WeightTrendChart 卡（272 svg + 头部/读数/图例）+ 结论行 | ~396px |
| CalorieWeekCard | ~150px |
| MacroMatrix（2×~110px + gap） | ~230px |
| BuildInfo + 间距 | ~70px |
| **合计** | **~890px ≈ 主流机型 1.1–1.4 屏** |

## 7. 边界与错误处理

- 打卡 < 3（副图未展示）→ WeightTrendChart 现有空状态/精简态照旧；结论行隐藏（与 §2.1 显隐规则一致）。
- 均线方向不可判（trend 数据不足）→ 结论行保留，走 `weekReviewDeficitOnly` 降级模板（§2.1/§8），绝不出残缺句。
- 窗口/周内无已记录天 → 结论行隐藏；`avg/hitDays = null` → `—`。
- `target ≤ 0` → 无虚线、无判定色、`hitDays=null`。
- 打开过但没吃的天 = 真实 0，计入 avg 与达标统计（沿用 `deficitSeries` 口径）。
- 纤维阈值取 `settings.macroTargets.fiber`，不硬编码 30。

## 8. i18n（6 语言同步）

新增键：

- `weight.weekReview`：`本周累计热量差额 {{kcal}} kcal · 体重{{dir}}`（trendDirection 可判时）
- `weight.weekReviewDeficitOnly`：`本周累计热量差额 {{kcal}} kcal`（**降级模板**：trendDirection=null 时整句切换到此键，不渲染悬空的「· 体重」分隔符——不允许在单句模板里留空插值）
- `weight.trendDown` / `weight.trendStable` / `weight.trendUp`：下降 / 平稳 / 上升
- `dashboard.weekAvg`：`周日均 {{n}}`
- `dashboard.hit`：`达标 {{n}}/7 天`
- `dashboard.remaining`：`{{left}} / {{target}}g`（模板两处复用：宏量传带符号余量 `+22`/`−15`；纤维传已摄入克数 `12`，**无符号**）

复用：`dashboard.calories/carbs/protein/fat/fiber`。删除：`dashboard.of`、`dashboard.ofCals`、`dashboard.avgPrior`（StatCard 专属；`under/over` 保留，DaySummaryCard 在用）。

## 9. 测试计划

- `weekly.test.ts`：weeklyStats——avg 含选中日/排除未打开天/无记录天→null、hitDays 双方向与 target=0→null、bars Mon–Sun 顺序。
- `weight.test.ts`：deficitWeekSummary——7 天窗口边界（selected−6 起点）、仅计存在天、hasData 翻转、跨月窗口日期键正确性（`addDays(fromDateKey(selected), -i)` 路径，如 selected=2026-03-01 → 窗口含 2026-02-23）；trendDirection——下降/上升/平稳（0.15 阈值边界）、trend 缺失→null。
- `WeekBars.test.tsx`（新）：填充高度、超标红帽、虚线存在性与位置、点选回调、今日加粗、target=0 无虚线。
- `MacroMatrix.test.tsx`（新）：四格顺序与标题、宏量余量正负号与颜色（超标红）、**纤维已摄入口径无符号**（不足警色/达标绿）、MiniBars 逐日配色、结论行文本、target=0 显示 —。
- `Dashboard.test.tsx`：三模块齐活（trend svg、calorie 柱、矩阵四格、结论行）、无 StatCard 残留、点柱换日期仍生效。
- `Goals.test.tsx`：趋势图不再渲染、budget-input 等配置项完好。
- `WeightTrendChart.test.tsx`：结论行渲染（有数据）、隐藏（hasData=false）、**trendDirection=null 时走 `weekReviewDeficitOnly` 降级键且不含「体重」段**。
- 删除 `StatCard.test.tsx`。

## 10. 文件清单

- 新增：`src/components/WeekBars.tsx`、`src/components/CalorieWeekCard.tsx`、`src/components/MacroMatrix.tsx`（+ 对应测试）
- 修改：`src/routes/Dashboard.tsx`（重写组合）、`src/routes/Goals.tsx`（删一行 + import）、`src/components/WeightTrendChart.tsx`（结论行）、`src/lib/weekly.ts`、`src/lib/weight.ts`、`src/i18n/locales/{en,zh,es,fr,ru,ar}.json`
- 删除：`src/components/StatCard.tsx`、`src/components/StatCard.test.tsx`
- 保留：`HalfRing`（Log 页 DaySummaryCard 在用）、Log 页全部

## 11. 明确不做（YAGNI）

- 不做 Tab 式图表容器（用户书面方案已废弃该形态）
- 不做同心环组件（已被 2×2 矩阵取代）
- 不改 Log 页、不改缺口副图口径、不改 WeightTrendChart 几何与命中逻辑
- 不新增历史预算存储（deficitSeries 的「当前预算」局限维持文档现状）
