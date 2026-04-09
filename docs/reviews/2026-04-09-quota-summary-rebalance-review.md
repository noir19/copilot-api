# 2026-04-09 Quota Summary Rebalance Review

## 范围

- 重新调整 overview 中模型分布与配额区域的视觉层级
- 修复配额摘要卡在第一屏中的高度失衡和内容挤压

## 改动

- 将第一屏右侧卡片从完整配额明细改为轻量摘要卡
- 摘要卡只展示计划信息、重置时间和三个 quota 的核心值
- 完整配额明细下沉到 overview 下方独立区域
- 调整模型分布卡和摘要卡的高度策略，避免空数据时右侧内容把整行拉歪

## 结果

- 第一屏更明确地以“模型分布”为主
- 配额信息不再在第一屏右侧形成过重的视觉堆积
- 空数据状态下左右卡片的底边关系更稳定

## 验证

- `bun run lint:fix`
- `bun run typecheck`
- `bun run build`
- 浏览器截图复核 `http://localhost:4142/dashboard`
