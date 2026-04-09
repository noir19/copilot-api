# Review: Dashboard 默认小时趋势 + OpenRouter 成本估算

**日期**: 2026-04-09  
**范围**: dashboard 趋势图默认粒度调整、OpenRouter 成本估算、模型分布费用视图

---

## 变更概要

### 1. 趋势图默认切回小时视角

- `RequestTrendCard` 默认粒度从“周”改回“日”
- `loadDashboardData()` 的初始时间序列请求改为 `bucket=60&limit=24`
- 首页首屏默认展示最近 24 小时的小时级请求趋势

### 2. 新增 OpenRouter 成本估算

- 新增 `src/services/openrouter/pricing.ts`
- 价格源使用 OpenRouter 官方模型目录接口：`https://openrouter.ai/api/v1/models`
- 服务端按模型缓存价格目录，默认 TTL 为 6 小时
- 成本按已记录的 `input_tokens` / `output_tokens` 分别乘 prompt / completion 单价估算
- 价格接口不可用时自动降级，不阻塞 dashboard

### 3. 首页与模型分布接入费用对比

- 顶部 KPI 新增 `OpenRouter 估价`
- 模型分布新增 `费用` 指标切换
- 模型卡片会展示匹配到的 OpenRouter 模型 id
- 未匹配价格时明确展示“暂未匹配到 OpenRouter 价格”

---

## 架构评审

### 优点

1. **不侵入主链路**
   成本估算只发生在 dashboard 查询路径，请求代理主流程不依赖外部价格接口。

2. **降级清晰**
   OpenRouter 价格抓取失败时不会让 `/api/dashboard/overview` 或 `/api/dashboard/models` 变成 500，只会返回空估算。

3. **数据来源真实**
   估算基于 SQLite 中已经落盘的真实请求日志和真实 token 统计，不是前端 mock。

### 注意事项

| 编号 | 级别 | 描述 |
|------|------|------|
| N1 | 建议 | 当前成本估算依赖 `input_tokens` 和 `output_tokens`。如果上游某些流式响应不回传 usage，这部分成本会被低估。 |
| N2 | 建议 | OpenRouter 模型匹配目前使用归一化 slug，能覆盖 `4.5` / `4-5` 一类差异，但仍可能遇到少数命名不一致模型，需要后续加人工 override。 |
| N3 | 信息 | 当前估价单位为 USD，页面使用 `formatUsd()` 做了小额显示优化。 |

---

## 测试清单

- [x] repository 聚合保留 `inputTokens` / `outputTokens`
- [x] OpenRouter 价格目录支持短模型名匹配
- [x] OpenRouter 价格目录缓存生效
- [x] dashboard route 测试通过
- [x] `bun run typecheck`
- [x] `bun run build`
