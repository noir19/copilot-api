# 2026-04-09 Overview Grid Normalization Review

## 范围

- 统一 overview 页的网格比例
- 移除重复的 `Copilot 配额摘要`

## 改动

- 保持顶部四个指标卡等分
- 第二行改为统一的 `6:4`
  - `模型分布`
  - `Copilot 配额`
- 第三行改为统一的 `6:4`
  - `最近请求`
  - `模型明细`
- 删除独立的 `Copilot 配额摘要`
- 只保留一个 `Copilot 配额` 卡，避免信息重复和视觉累赘

## 结果

- overview 页只剩两种网格关系：
  - `1:1:1:1`
  - `6:4`
- 页面不再同时混用 `6:4`、`3:7`、`7:5`
- 配额信息回到单一卡片，层级更清楚

## 验证

- `bun run lint:fix`
- `bun run typecheck`
- `bun run build`
- 浏览器截图复核 `http://localhost:4142/dashboard`
