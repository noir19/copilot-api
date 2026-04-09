# 2026-04-09 Model Distribution Chart Switcher Review

## 范围

- 增强 overview 页的“模型分布”卡片
- 增加图表切换与指标口径切换

## 改动

- 默认视图改为横向柱状图
- 新增指标切换：
  - 请求数
  - Token
- 新增视图切换：
  - 柱状图
  - 环形图
  - 明细表
- 卡片顶部增加当前统计口径摘要，便于快速扫读

## 设计原因

- 横向柱状图更适合展示模型名称较长的场景
- `请求数` 和 `Token` 对应两类不同观察目的：
  - 请求数看调用频率
  - Token 看消耗规模
- 环形图适合看占比，明细表适合看精确值与排序
- 这样模型分布卡片更符合 dashboard 的分析用途，而不是单一静态图

## 验证

- `bun run lint`
- `bun run typecheck`
- `bun run build`
