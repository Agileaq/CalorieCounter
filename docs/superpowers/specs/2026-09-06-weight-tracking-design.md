# 体重记录 + 科学减重趋势图 设计文档

日期：2026-09-06 · 状态：设计已获用户逐段批准 · 路径：architectural

## 1. 概述

两个相关功能：

1. **体重打卡卡片**（Log 页，ExerciseCard 之后）：每日体重（kg/lb 显示单位）+ 5 个预设事件标签多选。
2. **体重趋势图**（Goals 页顶部）：三层主图（散点 / 7 天均线 / 目标通道）+ 热量缺口与周速率两个对齐副图，范围切换 30 天 / 90 天 / 全部。

技术路线（方案 A，已批）：手写 SVG 图表（零新依赖，与 HalfRing/StatCard 一致）；体重数据存入 `DayLog`，搭现有 days 存储/备份/合并的顺风车。

## 2. 数据模型与存储

### 2.1 类型（src/types.ts）

```ts
export type WeightTag = 'cheat' | 'strength' | 'cardio' | 'stress' | 'period'

export interface DayLog {
  date: string
  meals: MealMap
  exercise: ExerciseEntry[]
  weightKg?: number      // 恒以 kg 存储，0.1 精度录入；可选字段
  tags?: WeightTag[]     // 当日事件标签，0..n，空时不存（undefined）
}

export interface Settings {
  dailyBudget: number
  macroTargets: { carbs: number; protein: number; fat: number; fiber: number }
  language: Language
  weightUnit: 'kg' | 'lb'       // 仅影响显示；默认 'kg'
  goalWeightKg: number | null   // 目标体重（通道终点）；默认 null
}
```

### 2.2 兼容与默认值

- 可选字段 + `loadSettings` 深合并补默认值（`weightUnit: 'kg'`、`goalWeightKg: null`），旧 localStorage 与旧备份**零迁移**（同 foodOverrides 先例）。
- 不改 `CURRENT_SCHEMA_VERSION`。

### 2.3 mergeBackup 修复（src/lib/importExport.ts）【关键】

当前 `mergeBackup` 重建 DayLog 时只保留 `{ date, meals, exercise }`，会丢弃新字段。修复：

- `weightKg`：incoming 覆盖 base；两边都无则不存。
- `tags`：incoming 覆盖 base，**整体替换数组、不做并集**（否则「取消选中」会被复活）；两边都无则不存。

### 2.4 上下文 API（src/state/AppContext.tsx）

- `setDayWeight(kg: number | null)` — mutateDay；`null` 删除 `weightKg` 字段。
- `toggleDayTag(tag: WeightTag)` — 已含则移除，未含则追加；结果为空数组时存 `undefined`。

## 3. 单位换算规则（锁定）

- 内部恒定 kg；`1 lb = 0.45359237 kg`。
- 卡片输入为 lb 时：显示 `kg × 2.2046226218`，用户输入的 lb 值存回时 ÷2.2046226218 并**保留 2 位小数**（防精度截断）。
- 所有显示（卡片、读数行、Y 轴标签）统一按当前 `settings.weightUnit` 换算后 `toFixed(1)`。
- kg|lb 段选切换 = `updateSettings({ weightUnit })` **全局持久化**，图表/设置页/卡片时刻同步。

## 4. 体重打卡卡片（WeightCard.tsx，Log 页 ExerciseCard 之后）

- 标题「体重」（`weight.title`），`.card` 款式同现有卡片。
- 第一行：`NumberInput`（小数，`hideZero`，占位符「未记录」）+ 右侧 kg|lb 双钮段选（选中 accent 填充）。切换单位时输入框立即按新单位显示当前存储值。
- **受控草稿（锁定）**：复用 `NumberInput` 的局部字符串草稿机制（聚焦期间外部值不同步回输入框），lb 模式换算经 onChange 映射 kg↔lb（存 2 位小数）；失焦规范化，**Enter 键触发 blur 提交**——防止受控渲染的浮点回弹抖动。
- 第二行：5 个预设胶囊标签（tap-to-toggle 多选，无文本输入不唤起键盘），选中 accent 填充白字。
- 数据按 `selectedDate` 独立存取；清空输入 = 删除当日体重。
- testids：`weight-input`、`weight-unit-kg`、`weight-unit-lb`、`weight-tag-cheat|strength|cardio|stress|period`。

## 5. 趋势计算（src/lib/weight.ts，全部纯函数）

### 5.1 输入与 X 域

- 从 `days` 提取有 `weightKg` 的 `(date, kg)` 升序列 `weighIns`。
- X 域：`start = range === 'all' ? 首次称重日 : max(today − 29/89 天, 首次称重日)`；`end = today`。逐日历日生成序列。
- 注：X 域以体重为锚——固定窗口内早于首次称重的缺口/速率数据不显示（体重是本视图的主轴）。
- **日期纯数学（锁定）**：全部用 `fromDateKey`（本地三参构造）+ `addDays`/`daysBetween`（新增纯函数），严禁 `new Date("YYYY-MM-DD")` 单参字符串（UTC 隐式转换/时区偏移）。

### 5.2 日序列与 carry-forward 熔断（锁定）

- 当日有称重 → 当日值；否则沿用上一个值，**连续沿用超过 7 天即熔断**（`MAX_GAP_DAYS = 7`）：之后的序列值为 `undefined`，直到下一次称重。
- 缺卡期趋势线断开成段；跨断档的周速率桶跳过。

### 5.3 7 天均线

- `trend[i] = mean(series[i-6..i])`，前 6 天扩展窗口；从第一次称重当天就有值（无空白期）。
- **熔断与恢复（锁定）**：`trend[i]` 与 `kg[i]` 同生共死——`kg[i]` undefined（熔断区间）则 `trend[i]` undefined；否则取**窗口内非 undefined 值的均值**。效果：断档时线在第 7 天止步；重新打卡当天均线即接续（恢复日窗口内有效值 = 新称重值本身），不会因窗口内残留 undefined 而再断一周。

### 5.4 目标通道（漏斗）

- **锚点分级 + Day-1 覆盖（锁定）**：通道自序列起点（首次称重日）起画，保证首次使用即有完整视觉覆盖；锚点分级——前 1–2 次称重：W₀ = 当前已有称重的动态均值（随新数据逐点收敛、平滑单日水分噪声）；N≥3：W₀ 永久锁死为第 3 次称重日的 7 日均线值（存储不可变→基线稳定）。锚点前 rails 自然上翘（elapsed<0）。goal ≥ W₀ 或无 goal → 无通道。
- 上轨（慢）：`W₀ − W₀ × 0.005 × elapsedDays/7`；下轨（快）：`× 0.01`。
- 每条虚线画到**首次触及 goalWeightKg 即收口**（漏斗尖），范围内未触及则画满。
- `goalWeightKg == null` 或 `goal ≥ W₀` → 不画 + 对应提示（v1 不支持增重通道）。

### 5.5 周速率副图

- `weekOf`（周一起始 ISO 周）分桶；**只画已结束的周**（`weekStart+7 ≤ today`；进行中的周 Δ 偏小会误导）。
- `Δ = trend(该周最后一个有定义 trend 的日期) − trend(该周第一个有定义 trend 的日期)`（用均线抗噪）。
- **首周策略（锁定）**：首周（首个含称重的自然周，即使从周中开始）同样按上式折算——周内不足 2 个有定义 trend 的日期则跳过该桶；仅 1 次称重时首尾同日 → Δ=0，按「0 不画」规则自然不渲染。测试按此断言。
- 柱几何（锁定）：`x = x(weekStart)`，`width = x(weekStart+7) − x(weekStart)`，即整周跨度、几何中心自然落在周四，与共享时间比例尺物理对齐。
- Δ<0 绿（掉秤）、Δ>0 红（涨）、0 不画。

### 5.6 缺口副图

- 每日 `deficit = (food − exercise) − 当前 dailyBudget`：负 = 赤字（绿），正 = 超标（红）；与全 App「剩余 = budget − (food − exercise)」语义一致。
- **该日期键不在 `days` 中 → 不画柱**（从未打开过 ≠ 没吃）；存在但空 = 真实 0 摄入，正常画。
- 历史天沿用当前 `dailyBudget`（应用不存历史预算，接受此限制并注明）。
- 柱宽 = 日列宽 × 0.7。

### 5.7 Y 轴动态缩放

- 主图：可见范围内散点 + trend 定义值 + 通道线的 min/max；上下各 pad 20%，**单侧保底 0.5 kg**。
- 副图围绕 0 对称：`bound = max(|min|, |max|, floor) × 1.2`；缺口 floor 1 kcal、速率 floor 0.5 kg。

## 6. 图表组件（WeightTrendChart.tsx，单个 SVG）

### 6.1 布局

- 位置：Goals 页 header 之后、targets 卡片之前。
- 顶行：标题「体重趋势」+ 范围段选（30 天 | 90 天 | 全部，默认 90 天，段选状态仅组件本地）。
- 一个 SVG 内三段共享 X 缩放：主图 200 → 事件 lane 16 → 缺口 60 → 周速率 60，加轴标签，内部坐标系固定 `W=360`。
- Y 轴标签按当前单位换算 `toFixed(1)`；X 轴约 5 个刻度，`Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric' })`。
- 底部 muted 图例行：散点 / 7 天均值 / 安全通道。

### 6.2 三层渲染顺序（主图）

1. 通道：两轨间淡绿填充（opacity 0.08）+ 灰虚线双轨（在/外通道语义见 §5.4 提示）
2. 散点：r=3，fill `#b0b0b5`，opacity 0.55，无连线
3. 均线：`var(--accent)`，宽 2.5，圆角 join；断档处分段（M 起新段）
   - **渲染门槛**：称重 ≥3 次才画均线（与通道锚点一致，1–2 次的「线」无意义）；≥3 次时线自首次称重日起画（扩展窗口，无空白期）

### 6.3 事件 lane

- 0 事件：无渲染。
- 1 事件：该日期 x 处彩色圆点 r=4。颜色常量：cheat `#f5a623`、strength `#5b3df5`、cardio `#34c0eb`、stress `#8a8a8e`、period `#f56fa1`。
- ≥2 事件：**聚合标记**——`var(--accent)` 描边空心圆 + 内部「+」字形，不堆叠多点。

### 6.4 固定读数行（替代浮动 tooltip）

- 图表上方常驻一行：`日期 · 82.5 kg · 均线 82.8 · 放纵餐 · 力量训练`（标签名 i18n、按单位换算）。
- 点按任一日期列（透明命中 rect，宽 = 列宽）刷新读数；无数据显示「未记录」；默认显示**当前 X 域内**最近一次称重（切范围时随之重置）。
- 不做浮动定位（规避手机小屏/RTL 边界），不弹二级窗。

### 6.5 RTL 命中防坑（锁定）

- 触摸/点击坐标经 `svg.getScreenCTM().inverse()` 映射到内部 LTR viewBox（元素矩阵与外层 `dir` 无关）；退化路径 `rect.left + (clientX − rect.left) × 360 / rect.width`。
- **禁止 `offsetX`**（RTL 容器下会翻转导致命中列反转）。
- SVG 内部一律 LTR 渲染（时间轴惯例）；读数行/卡片用逻辑属性布局。

### 6.6 空态与性能

- 0 次称重：提示去 Log 页打卡；1–2 次：散点 + 「再记录几天就能看到均线」，无均线/通道/副图。
- `goalWeightKg` 的 UI 入口：targets 卡片新增一行「目标体重」（`goals.goalWeight`，NumberInput 小数，空值 = null）。
- all 视图多年数据：均线按 x 像素步长 1 采样；散点只画真实打卡点。

## 7. i18n（6 语言平齐，en 为源）

- 新 namespace `weight.*`：title、placeholder、kg、lb、range30/90/all、trendTitle、legend×3、readout 标签、noData、tagCheat/tagStrength/tagCardio/tagStress/tagPeriod、empty0、empty1、corridorNoGoal、corridorBadGoal、rateSub、deficitSub。
- `goals.goalWeight`（目标体重行）。
- 6 文件同步翻译；`i18n.test.ts` 键平齐自动把关。

## 8. 边界汇总

| 情况 | 行为 |
|---|---|
| 0 次称重 | 空态提示，无图 |
| 1–2 次 | 散点 + 提示，无均线/通道/副图 |
| <3 次 | 照常画通道：锚定首次称重，W₀ = 动态均值 |
| goal 未设 / goal ≥ W₀ | 通道隐藏 + 对应提示 |
| 缺卡 >7 天 | carry-forward 熔断：均线断段、跨断档周速率桶跳过 |
| 历史预算 | 副图沿用当前 dailyBudget（已注明限制） |
| RTL | SVG 内 LTR；CTM 命中映射；UI 逻辑属性 |

## 9. 测试策略（TDD，vitest + RTL）

- **weight.test.ts**（大头）：carry-forward 与 7 天熔断、SMA 扩展窗口与 undefined 传播、通道锚点（分级 W₀、自首日起画、公式、收口于 goal）、周分桶 Δ 与完整周过滤、缺口序列（不存在日 vs 空记录日）、Y 轴 padding 保底、`daysBetween` 纯度（跨月/跨年）。
- **WeightCard.test.tsx**：位于 ExerciseCard 之后渲染；lb 输入 → 存 kg 保留 2 位；单位切换持久化 + 显示换算 toFixed(1)；标签多选 toggle；清空删除体重。
- **WeightTrendChart.test.tsx**：散点数 = 范围内打卡数；均线/通道 path 三态；范围切换过滤；事件 lane 单点 vs 聚合「+」；点按日期读数行刷新；空态文案；目标体重行（Goals 增量）。
- **importExport 增量**：mergeBackup 保留 weight/tags（incoming 覆盖语义）。
- **Log.test.tsx** 无卡片数断言，不受影响（已验证）。
