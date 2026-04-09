# Review: OpenRouter 价格按自然日写入 SQLite

**日期**: 2026-04-09  
**范围**: OpenRouter 价格缓存从进程内 TTL 改为 SQLite 自然日快照

---

## 变更概要

- 新增 `openrouter_pricing_cache` 表
- OpenRouter 价格不再只存在进程内内存里
- dashboard 读取价格时会按下面顺序处理：
  1. 先看内存里是否已有“今天”的快照
  2. 没有就读 SQLite 里“今天”的快照
  3. 今天没有，再看 SQLite 里最近一次旧快照，先拿来兜底
  4. 只有在“当前自然日还没有快照”时，才去请求 OpenRouter 官方 models 接口
  5. 拉取成功后，把当天快照写回 SQLite，并清理旧快照

---

## 结果

这意味着现在不是“每次 dashboard 刷新都打 OpenRouter”：

- 同一天内，刷新 dashboard 只会走内存或 SQLite
- 进程重启后，也会先复用 SQLite 当天快照
- 只有跨自然日后第一次需要估价时，才会重新拉一次官方价格

---

## 架构评审

### 优点

1. **重启不丢缓存**
   价格快照落到了 SQLite，容器或进程重启后不会退回到冷启动状态。

2. **刷新行为稳定**
   同一天内无论 overview 和 models 调多少次，都不会重复打外部价格接口。

3. **失败降级更平滑**
   如果 OpenRouter 当天接口失败，系统仍可先使用 SQLite 里最近一次旧快照，不影响 dashboard 基本可用性。

### 注意事项

| 编号 | 级别 | 描述 |
|------|------|------|
| N1 | 建议 | “自然日”使用服务端本地时区计算，不是 UTC 日界线。 |
| N2 | 建议 | 当前策略只保留最新一天的快照，不做历史价格追踪；如果以后要分析价格变动，再扩成多日历史表。 |

---

## 测试清单

- [x] 同一天已有 SQLite 快照时，不发起远程请求
- [x] 旧日快照存在时，仅在新自然日刷新一次
- [x] `bun test tests/openrouter-pricing.test.ts tests/dashboard-route.test.ts tests/request-logs-repository.test.ts`
- [x] `bun run typecheck`
- [x] `bun run build`
