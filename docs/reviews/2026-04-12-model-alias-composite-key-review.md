# 2026-04-12 Model Alias Composite Key Review

## 背景

Dashboard 的模型别名配置原先由 `source_model` 单列唯一约束控制。这会导致同一个请求模型只能存在一条配置，无法同时保留启用和停用两种状态的记录。

## 调整

- `model_aliases` 改为以 `(source_model, enabled)` 作为复合主键。
- `id` 保留为 `UNIQUE` 字段，继续作为 Dashboard 编辑和删除接口的稳定行标识。
- 初始化数据库时会迁移旧表结构：重建 `model_aliases`，迁移原有数据，并把模型 id 归一化为小写。
- 重复写入同一请求模型 + 同一状态时，repository 抛出 `ModelAliasConflictError`。
- Dashboard API 将冲突转成 `409 model_alias_conflict`，将找不到别名转成 `404 model_alias_not_found`，避免前端只看到泛泛的 Internal error。

## 验证

- `tests/model-aliases-repository.test.ts` 覆盖同一请求模型下启用/停用两条记录可共存，以及同状态重复写入会失败。
- `tests/db-schema.test.ts` 覆盖旧 `source_model UNIQUE` 表迁移到复合主键。
- `tests/dashboard-route.test.ts` 覆盖重复配置返回明确的 409 JSON 错误。
