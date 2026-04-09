# 2026-04-09 Model Distribution Overflow Fix Review

## 范围

- 修复 overview 中模型分布横向柱状图越出卡片框体的问题

## 改动

- 为柱状图绘图区增加裁切容器
- 补回横向柱状图的数值轴配置
- 调整柱状图 margin、barSize 和 grid 配置
- 保持原有的图表切换能力不变

## 结果

- 横向柱状图的柱体与网格线不再越出卡片边界
- 只有一条数据时也能稳定显示在框体内部

## 验证

- `bun run lint:fix`
- `bun run build`
- 浏览器截图复核 `http://localhost:4142/dashboard`
