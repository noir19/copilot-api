# 2026-04-09 SQLite 模型别名与中文 Dashboard Review

## 范围

- 将请求路径上的模型别名来源从 `model-aliases.json` 切换为 SQLite `model_aliases` 表
- 保留 `model_mappings` 作为展示名映射表，两张表职责分离
- Dashboard 中文化
- Dashboard 新增请求日志页面
- Dashboard 新增模型别名管理页面
- Docker 与 README 去除对 `model-aliases.json` 的运行时依赖说明

## 设计结论

- `model_aliases` 负责请求路径模型解析
- `model_mappings` 负责展示层模型名称映射
- 两张表都通过 SQLite 持久化，并在进程启动后加载到内存缓存
- 请求路径只读内存缓存，不直接查询 SQLite
- Dashboard 写入后刷新对应缓存，确保新配置立即生效
- 请求日志继续异步入库，日志页直接消费真实 SQLite 数据

## 关键改动

- 新增 `src/db/model-aliases.ts`
  - 提供 `model_aliases` 仓储 CRUD
- 新增 `src/lib/model-alias-store.ts`
  - 提供运行时别名缓存与快照
- 更新 `src/lib/model-map.ts`
  - 不再读取 `model-aliases.json`
  - 改为从运行时 SQLite 别名缓存解析目标模型
- 更新 `src/db/schema.ts`
  - 新增 `model_aliases` 表和索引
- 更新 `src/db/runtime.ts`
  - 初始化别名仓储和缓存
  - 提供别名 CRUD 与 reload
- 更新 `src/routes/dashboard/route.ts`
  - 新增 `/api/dashboard/aliases` CRUD
- 更新 Dashboard 前端
  - 中文化主要页面
  - 新增请求日志页
  - 新增模型别名管理页
- 更新 Docker 与 README
  - 不再复制或挂载 `model-aliases.json`
  - 明确 SQLite 为唯一运行时来源

## 验证

- `bun run lint`
- `bun run typecheck`
- `bun test tests/dashboard-route.test.ts tests/model-aliases-repository.test.ts tests/model-alias-store.test.ts tests/model-mappings-repository.test.ts tests/request-logs-repository.test.ts`
- `bun run build`

## 风险与后续

- 当前日志页读取的是 `/api/dashboard/requests?limit=100`，适合近期排查，但还不是完整分页日志浏览器
- `README.zh-CN.md` 还未同步这轮 SQLite-only alias 与中文 dashboard 说明
- 若后续需要更大日志量，应给日志页单独加分页、筛选和导出接口
