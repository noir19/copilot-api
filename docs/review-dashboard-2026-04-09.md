# Dashboard 功能迭代 Review — 2026-04-09

## 变更范围

| 指标 | 数值 |
|------|------|
| 提交数 | 8 |
| 改动文件 | 12 |
| 净增行数 | +366 / -115 |
| 涉及层次 | 后端 DB / 路由 / 服务 + 前端组件 / API 层 |

---

## 功能清单

### 1. Dash-to-dot 自动转换开关

**文件**: `src/lib/model-map.ts`, `dashboard/src/components/dashboard/model-aliases-panel.tsx`

模型解析链的 step 3（dash-to-dot：将 `claude-sonnet-4-6` 匹配为 `claude-sonnet-4.6`）现在可通过 dashboard 控制。

- 新增开关卡片位于"模型映射"页顶部
- 切换即时生效，写入 `dashboard_meta` 表 `dash_to_dot_enabled` key
- 失败时自动回滚 UI 状态（乐观更新 + 回滚）
- 默认启用（key 不存在 = true）

**设计决策**: 不做通用正则引擎。alias 表已可处理任意一对一映射，一个开关覆盖 90% 需求，避免 ReDoS 风险和边界模糊。

---

### 2. 请求日志表格全面改版

**文件**: `dashboard/src/components/dashboard/request-logs-panel.tsx`

| 改动 | 说明 |
|------|------|
| 新增"请求模型"列 | 显示 `modelDisplay`（用户实际请求的模型名） |
| 新增"估价"列 | 前端 computed：`openRouterEstimatedCostUsd / totalTokens × 单次 token 数` |
| 删除"流式"和"账号类型"列 | 信息密度低，释放表格空间 |
| 数字右对齐 + 千位分隔符 | 延迟、Token 列均使用 `tabular-nums formatNumber` |
| 错误信息截断 + 弹窗 | 截断文本点击后弹出全文 modal，Escape 键和背景点击关闭 |
| 手动提交查询模式 | `committedFilter` 模式：过滤条件修改不立即触发请求，点"查询"才提交 |
| 查询按钮强反馈 | loading 中：spinner + "查询中" + disabled；完成后：绿色 + 勾号 + "已查询"（保持 800ms） |

**估价说明**: 基于模型级别的平均 token 单价（input+output 混合），列头"估价"明确标注为近似值。

---

### 3. 请求趋势图优化

**文件**: `dashboard/src/components/dashboard/request-trend-card.tsx`, `src/db/request-logs.ts`, `src/routes/dashboard/route.ts`, `dashboard/src/lib/dashboard-api.ts`

**日历窗口模式** (新功能):

- 新增"滚动/自然"切换：滚动 = 过去 N 个 bucket，自然 = 当前日历周期从起点开始
- 自然模式边界：日从 00:00、周从周一、月从 1 日、年从 1 月 1 日
- 需要后端支持 `timeFrom` 过滤：`GET /api/dashboard/time-series?timeFrom=ISO8601`
- SQL 层添加 `WHERE timestamp >= ?2` 条件，参数化，无注入风险

**控件布局**:

- 第一行：滚动/自然 ｜ 日/周/月/年（竖线分隔）
- 第二行：请求数 / Token / 错误数（白底 border 容器，彩色选中态）
- 两行右对齐，统计数字使用 `formatCompactNumber`（防止 Token 总量过长）

---

### 4. 指标卡片布局调整

**文件**: `dashboard/src/components/dashboard/metric-card.tsx`

图标移至左侧，数字右对齐。视觉扫描效率更高——左侧看图标识别类目，右侧看数字对比大小。

---

### 5. 概览页布局优先级调整

**文件**: `dashboard/src/components/dashboard/overview-panel.tsx`

新顺序：指标卡 → **模型分布 + Copilot 限额** → 请求趋势图

模型分布和限额信息密度高、实用性强，从页面底部提升至中间位置。趋势图作为补充信息保留在底部。

---

### 6. VS Code 版本服务清理

**文件**: `src/services/get-vscode-version.ts`, `src/start.ts`

从 AUR PKGBUILD 抓取改为调用 Microsoft 官方 API，更可靠。24h 刷新定时器在服务启动后初始化。

---

## 安全性

- SQL 参数化：所有用户输入（`timeFrom`、filter 条件）均使用 `?N` 占位符，无字符串拼接
- `strftime` 格式字符串来自闭合函数的硬编码返回值，非用户输入
- 无新增认证/授权变更

## 可访问性

- 错误弹窗：`role="dialog" aria-modal="true"` + 全局 `document.addEventListener("keydown")` 处理 Escape

## 已知局限

- 估价为混合单价（input/output token 不区分），精度受模型定价差异影响
- 日历模式使用浏览器本地时区计算边界，服务器存储 UTC，在正偏移时区行为符合预期
