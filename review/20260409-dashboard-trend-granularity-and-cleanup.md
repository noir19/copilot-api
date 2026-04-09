# Review: 趋势图粒度扩展 + review 修复 + 死代码清理

**日期**: 2026-04-09
**范围**: `c1f7f31` fix(dashboard): review fixes and dead code cleanup + 未提交的趋势图粒度变更

---

## 变更概要

### 1. 趋势图粒度扩展 (request-trend-card.tsx, request-logs.ts, route.ts)

原有两档（小时/天）扩展为四档，并修正“周视图按小时聚合但按天展示”的语义错位：

| 粒度 | 按钮标签 | 分桶 | 数据点 | X 轴标签 | Tooltip 标签 |
|------|---------|------|--------|---------|-------------|
| 日 | 日 | 60 min | 24 | `14:00` | `04/09 14:00` |
| 周 | 周 | 1440 min | 7 | `04/09` | `04/09` |
| 月 | 月 | 1440 min | 30 | `04/09` | `04/09` |
| 年 | 年 | 43200 min | 12 | `2026/04` | `2026/04` |

**后端改动**:
- `getBucketFormat()` 新增 `>=43200` (月: `%Y-%m-01`) 和 `>=525600` (年: `%Y-01-01`) 分支
- `clampInt` 的 bucket 上限从 1440 → 525600

**前端改动**:
- `Granularity` 类型从 `"hour" | "day"` → `"day" | "week" | "month" | "year"`
- X 轴和 Tooltip 使用不同的格式化函数（`formatBucketLabel` / `formatBucketTooltip`），避免日视图 X 轴重复日期、周视图标签过密
- 默认视图从 `"hour"` → `"week"`，并把初始请求改成 `bucket=1440&limit=7`
- 新增 `formatHourOnly`、`formatMonthBucket` 格式化函数
- `week` tooltip 从小时标签改为天标签，和日粒度保持清晰区分
- 趋势图补齐零值桶，避免无请求时段被折叠压缩

### 2. Review 修复 (c1f7f31)

- **C1 (Critical)**: `clampInt()` 验证 limit/offset 查询参数，防止 NaN 和越界
- **I3 (Important)**: count 请求失败时显示"统计失败"，不再永远卡在"统计中..."
- **I1 (Important)**: 清理展示映射死代码（详见下方）

### 3. 展示映射功能移除 (c1f7f31)

**删除文件** (4 个):
- `dashboard/src/components/dashboard/create-mapping-card.tsx`
- `dashboard/src/components/dashboard/mapping-row.tsx`
- `dashboard/src/components/dashboard/mappings-panel.tsx`
- `dashboard/src/components/dashboard/mappings-table-card.tsx`

**清理范围**:
- `dashboard-api.ts`: 移除 `ModelMappingRecord`, `MappingsResponse`, `MappingDraft`, `EMPTY_DRAFT`, `loadMappings`, `createMapping`, `updateMapping`, `deleteMapping`
- `route.ts`: 移除 mapping 相关 deps 和所有 `/mappings` 端点
- `server.ts`: 移除 `getModelMappingRepository`, `getModelMappingStore`, `createModelMapping`, `updateModelMapping`, `removeModelMapping` imports 和对应 dep 注入
- `app.tsx`: 移除 `mappingsResponse` state 和 `loadMappings` 调用

**净删除**: 632 行

---

## 架构评审

### 优点

1. **X 轴 / Tooltip 分离**: `formatBucketLabel` 和 `formatBucketTooltip` 使用 `Record<Granularity, fn>` 映射，类型安全且易于扩展
2. **initialData 复用**: 周视图直接使用 `loadDashboardData()` 预取的数据（`bucket=1440&limit=7`），无额外请求
3. **分桶参数透传**: 前端只传 `bucketMinutes` + `limit`，后端 `getBucketFormat` 按阈值自动选格式，前后端解耦

### 注意事项

| 编号 | 级别 | 描述 |
|------|------|------|
| N1 | 建议 | `formatBucketLabel` / `formatBucketTooltip` 每次 render 重建对象。数据量小无性能影响，如后续需要可提升为模块常量 |
| N2 | 建议 | `modelDisplay` 字段仍保留在 DB schema / 接口 / insert 中但始终等于 `modelRaw`，属遗留冗余，可后续清理 |
| N3 | 信息 | 年视图 `bucketMinutes=43200`（30 天）在后端通过 `getBucketFormat` 命中 `%Y-%m-01` 分桶，不依赖精确天数。525600（365 天）分支目前未被前端使用但保留作为防御 |

---

## 测试清单

- [ ] 趋势图：切换日/周/月/年四个粒度，确认数据加载和 X 轴标签格式正确
- [ ] 趋势图：日视图 X 轴只显示小时 (`14:00`)，hover 显示完整时间
- [ ] 趋势图：周视图 X 轴按天 (`04/09`)，hover 也按天显示，避免伪装成小时序列
- [ ] 趋势图：月/年视图标签分别为 `MM/DD` 和 `YYYY/MM`
- [ ] 趋势图：切换粒度时 loading overlay 正常显示/消失
- [ ] 日志分页：翻页按钮、总数统计、筛选条件联动正常
- [ ] 日志筛选：count 请求失败时显示"统计失败"
- [ ] 模型映射 tab：确认只显示请求映射（alias），无展示映射
- [ ] 构建: `pnpm run build` 通过（已验证）
