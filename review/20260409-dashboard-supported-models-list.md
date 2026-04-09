# Review: 模型别名页增加 Copilot 支持模型清单

**日期**: 2026-04-09  
**范围**: dashboard 模型别名页接入 Copilot 当前支持模型列表

---

## 变更概要

- 新增 `/api/dashboard/supported-models`
- 数据源直接复用 Copilot 真实模型列表缓存，不走假数据
- 模型别名页新增 `Copilot 支持模型` 卡片
- 每个模型项展示：
  - 模型名称
  - 模型 id
  - vendor
  - preview 标记
- 支持一键把某个模型 id 填入“目标模型”输入框

---

## 设计说明

### 为什么要单独加这份列表

请求统计里的模型分布只能看到“最近实际打到过的模型”，不能回答“当前 Copilot 理论上支持哪些模型”。  
模型别名配置需要后者，否则用户还是得自己猜模型 id。

### 数据来源

- dashboard 接口从服务端 runtime 读取 `state.models`
- 如果当前进程还没缓存模型列表，会先调用 `cacheModels()`
- 因此这份列表和 `/v1/models` 使用的是同一份真实来源

---

## 结果

模型别名页现在既能看当前 alias 规则，也能直接对照 Copilot 支持模型来配置目标模型，降低了手写字符串出错的概率。

---

## 测试清单

- [x] `dashboard-route` 新增 supported-models 接口测试
- [x] `bun run lint:fix`
- [x] `bun run typecheck`
- [x] `bun run build`
