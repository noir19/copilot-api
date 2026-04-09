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

---

## 追加变更（同日）

### 7. GPT-5 系列 `max_tokens` → `max_completion_tokens` 兼容

**文件**: `src/routes/chat-completions/handler.ts`, `src/routes/messages/non-stream-translation.ts`, `src/services/copilot/create-chat-completions.ts`

GPT-5 系列模型（`gpt-5.*`）不支持 `max_tokens` 参数，必须使用 `max_completion_tokens`。

- 检测条件：`model.toLowerCase().startsWith("gpt-5")`
- `/v1/messages`（Anthropic 翻译层）：在 `translateToOpenAI()` 中做参数转换
- `/v1/chat/completions`（OpenAI 直通）：在 `handleCompletion()` 中做参数转换
- 两条路径都覆盖了"用户未传"和"用户已传"两种场景

**根因**: Claude Code 通过 `/v1/messages` 发请求，Anthropic payload 的 `max_tokens` 被直接透传给 Copilot API，GPT-5 拒绝了。

### 8. 模型卡片标注 Display Name / Model ID + 复制按钮

**文件**: `dashboard/src/components/dashboard/model-aliases-panel.tsx`

- 每个模型卡片增加 `Display Name` 和 `Model ID` 标签，区分 GitHub Copilot 返回的展示名和实际 API 用的原始 id
- Model ID 旁边加复制按钮（点击变绿色勾号 1.5s），方便用户复制准确的 model id 用于配置

### 9. 请求日志区分请求模型 / 目标模型，估价按目标模型

**文件**: `src/lib/request-log.ts`, `src/routes/messages/handler.ts`, `src/routes/chat-completions/handler.ts`

- 请求日志写入改为同时记录两种模型：
  - `requestModel` = 用户原始请求模型
  - `targetModel` = 最终发给 Copilot 的目标模型
- 落库语义对齐为：
  - `model_display` = 请求模型
  - `model_raw` = 目标模型
- `/v1/messages` 路径现在会把 `anthropicPayload.model` 和 `openAIPayload.model` 分开记录
- `/v1/chat/completions` 路径统一跟随后端新日志契约
- dashboard 请求日志表的“请求模型 / 目标模型”列无需改 UI，即可显示正确含义
- 估价继续基于 `model_raw`，因此修复后会自然按目标模型计价

**已知影响**: 历史日志因原始请求模型未保存，无法可靠回填。修复仅对新产生的日志生效。
