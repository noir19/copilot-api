# 2026-04-12 Model Alias Layout and Filter Review

## 背景

模型映射页原先把模型别名列表和新增表单放在左右两栏。新增表单较窄，字段不利于横向输入；模型别名列表也缺少按请求模型和状态筛选的入口。

## 调整

- 将“新增模型别名”移到模型别名表上方，并改成横向表单。
- 将“模型别名”表放到下方，占满宽度。
- 增加请求模型搜索框，按 `sourceModel` 做大小写不敏感包含匹配。
- 增加状态筛选：全部、启用、停用。
- 增加“当前显示”计数和筛选后空态。
- 对 Copilot 支持模型列表按 `model.id` 去重，避免重复模型 id 触发 React key error。
- 调整“立即启用”和“保存别名”的桌面对齐，让它们与左侧两个输入框的控制行对齐。

## 验证

- `bun test tests/model-alias-filter.test.ts`
- `bun run lint`
- `bun run typecheck`
- `bun run build`
- `COPILOT_API_DB_PATH=/tmp/copilot-api-bun-test-20260412-ui.db bun test`
- 浏览器检查模型映射页：桌面和 390px 窄屏布局可用；搜索 `opus` + 状态 `启用` 后显示 1 条；模型映射页 console 无错误。
