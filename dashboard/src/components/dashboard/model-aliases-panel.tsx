import { Check, Copy, RefreshCcw } from "lucide-react"
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  type AliasDraft,
  type AliasesResponse,
  createAlias,
  deleteAlias,
  EMPTY_ALIAS_DRAFT,
  loadSettings,
  type ModelAliasRecord,
  type ModelReasoningEffort,
  refreshSupportedModels,
  type SupportedModel,
  saveSettings,
  updateAlias,
} from "../../lib/dashboard-api"
import { formatTimestamp } from "../../lib/format"
import {
  filterModelAliases,
  type ModelAliasStatusFilter,
} from "../../lib/model-alias-filter"
import { cn } from "../../lib/utils"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"
import { Input } from "../ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "../ui/table"

const MODEL_REASONING_EFFORT_PREFIX = "model_reasoning_effort:"
const REASONING_OPTIONS: Array<{
  label: string
  value: ModelReasoningEffort
}> = [
  { label: "不思考", value: "none" },
  { label: "低", value: "low" },
  { label: "中", value: "medium" },
  { label: "高", value: "high" },
  { label: "极高", value: "xhigh" },
]

function modelReasoningEffortKey(modelId: string) {
  return `${MODEL_REASONING_EFFORT_PREFIX}${modelId}`
}

function isModelReasoningEffort(value: unknown): value is ModelReasoningEffort {
  return REASONING_OPTIONS.some((option) => option.value === value)
}

function getReasoningOptions(model: SupportedModel) {
  const rawValues = model.capabilities.supports.reasoning_effort
  if (!Array.isArray(rawValues)) {
    return []
  }

  const supportedValues = rawValues.filter(isModelReasoningEffort)
  return REASONING_OPTIONS.filter((option) =>
    supportedValues.includes(option.value),
  )
}

export function ModelAliasesPanel({
  aliases,
  onChanged,
  supportedModels,
}: {
  aliases: AliasesResponse
  onChanged: () => Promise<void>
  supportedModels: Array<SupportedModel>
}) {
  const [draft, setDraft] = useState<AliasDraft>(EMPTY_ALIAS_DRAFT)
  const [editingDraft, setEditingDraft] =
    useState<AliasDraft>(EMPTY_ALIAS_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isRefreshingModels, setIsRefreshingModels] = useState(false)
  const [dashToDotEnabled, setDashToDotEnabled] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [modelReasoningEfforts, setModelReasoningEfforts] = useState<
    Record<string, "" | ModelReasoningEffort>
  >({})
  const [aliasQuery, setAliasQuery] = useState("")
  const [aliasStatusFilter, setAliasStatusFilter] =
    useState<ModelAliasStatusFilter>("all")
  const filteredAliases = useMemo(
    () =>
      filterModelAliases(aliases.data, {
        query: aliasQuery,
        status: aliasStatusFilter,
      }),
    [aliases.data, aliasQuery, aliasStatusFilter],
  )
  const uniqueSupportedModels = useMemo(() => {
    const seenModelIds = new Set<string>()
    return supportedModels.filter((model) => {
      if (seenModelIds.has(model.id)) return false
      seenModelIds.add(model.id)
      return true
    })
  }, [supportedModels])

  function copyModelId(id: string) {
    void navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    })
  }

  useEffect(() => {
    loadSettings()
      .then((data) => {
        setDashToDotEnabled(data.settings.dash_to_dot_enabled !== "false")
        const nextReasoningEfforts: Record<string, "" | ModelReasoningEffort> =
          {}
        for (const [key, value] of Object.entries(data.settings)) {
          if (!key.startsWith(MODEL_REASONING_EFFORT_PREFIX)) continue
          if (!isModelReasoningEffort(value)) continue
          nextReasoningEfforts[
            key.slice(MODEL_REASONING_EFFORT_PREFIX.length)
          ] = value
        }
        setModelReasoningEfforts(nextReasoningEfforts)
      })
      .catch(() => {})
  }, [])

  const toggleDashToDot = useCallback(async (enabled: boolean) => {
    setDashToDotEnabled(enabled)
    try {
      await saveSettings({ dash_to_dot_enabled: enabled ? "true" : "false" })
    } catch {
      setDashToDotEnabled(!enabled)
    }
  }, [])

  async function handleRefreshModels() {
    setError(null)
    setIsRefreshingModels(true)

    try {
      await refreshSupportedModels()
      await onChanged()
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "模型清单刷新失败",
      )
    } finally {
      setIsRefreshingModels(false)
    }
  }

  async function handleReasoningEffortChange(
    modelId: string,
    value: "" | ModelReasoningEffort,
  ) {
    const previous = modelReasoningEfforts[modelId] ?? ""
    setError(null)
    setModelReasoningEfforts((current) => ({
      ...current,
      [modelId]: value,
    }))

    try {
      await saveSettings({ [modelReasoningEffortKey(modelId)]: value })
    } catch (saveError) {
      setModelReasoningEfforts((current) => ({
        ...current,
        [modelId]: previous,
      }))
      setError(
        saveError instanceof Error ? saveError.message : "思考深度保存失败",
      )
    }
  }

  async function withRefresh(action: () => Promise<void>) {
    setError(null)
    setIsSaving(true)

    try {
      await action()
      await onChanged()
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "模型别名更新失败",
      )
    } finally {
      setIsSaving(false)
    }
  }

  function handleCreate() {
    void withRefresh(async () => {
      await createAlias(draft)
      setDraft(EMPTY_ALIAS_DRAFT)
    })
  }

  function handleUpdate(id: string) {
    void withRefresh(async () => {
      await updateAlias(id, editingDraft)
      setEditingId(null)
    })
  }

  function handleDelete(id: string) {
    void withRefresh(async () => {
      await deleteAlias(id)
    })
  }

  function handleEditStart(alias: ModelAliasRecord) {
    setEditingId(alias.id)
    setEditingDraft({
      enabled: alias.enabled,
      sourceModel: alias.sourceModel,
      targetModel: alias.targetModel,
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">映射策略</CardTitle>
        </CardHeader>
        <CardContent>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              checked={dashToDotEnabled}
              onChange={(e) => void toggleDashToDot(e.target.checked)}
              type="checkbox"
            />
            启用 dash-to-dot 自动转换
          </label>
          <p className="mt-2 text-xs text-slate-500">
            启用后，请求模型名中的短横线会自动匹配可用模型的点号版本（如
            claude-sonnet-4-6 → claude-sonnet-4.6）。 关闭后需手动添加别名。
          </p>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>新增模型别名</CardTitle>
          <CardDescription>
            保存后立即写入 SQLite，并刷新运行时缓存。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto_auto] lg:items-start">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="model-alias-source-model"
              >
                请求模型
              </label>
              <Input
                id="model-alias-source-model"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    sourceModel: event.target.value,
                  }))
                }
                placeholder="claude-opus-4-6"
                value={draft.sourceModel}
              />
              <p className="text-xs text-slate-500">客户端实际请求的模型名。</p>
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="model-alias-target-model"
              >
                Copilot 目标模型
              </label>
              <Input
                id="model-alias-target-model"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    targetModel: event.target.value,
                  }))
                }
                placeholder="claude-opus-4.6"
                value={draft.targetModel}
              />
              <p className="text-xs text-slate-500">
                Copilot 当前支持的真实模型 id。
              </p>
            </div>
            <label className="flex h-10 items-center gap-2 whitespace-nowrap text-sm text-slate-600 lg:mt-7">
              <input
                checked={draft.enabled}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    enabled: event.target.checked,
                  }))
                }
                type="checkbox"
              />
              立即启用
            </label>
            <Button
              className="w-full lg:mt-7 lg:w-auto"
              disabled={
                isSaving ||
                draft.sourceModel.trim().length === 0 ||
                draft.targetModel.trim().length === 0
              }
              onClick={handleCreate}
            >
              保存别名
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>模型别名</CardTitle>
          <CardDescription>
            这张表控制客户端请求模型如何映射到 Copilot 实际目标模型，例如
            <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
              claude-opus-4-6
            </code>
            {"->"}
            <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
              claude-opus-4.6
            </code>
            。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-3">
              <Badge>版本 {aliases.meta.version}</Badge>
              <Badge>共 {aliases.meta.count} 条</Badge>
              <Badge>启用 {aliases.meta.enabledCount} 条</Badge>
              <Badge>最近加载 {formatTimestamp(aliases.meta.loadedAt)}</Badge>
              <Badge>当前显示 {filteredAliases.length} 条</Badge>
            </div>
            <div className="ml-auto flex w-full flex-col gap-3 md:w-auto md:flex-row">
              <Input
                className="md:w-64"
                onChange={(event) => setAliasQuery(event.target.value)}
                placeholder="搜索请求模型"
                value={aliasQuery}
              />
              <select
                className="h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                onChange={(event) =>
                  setAliasStatusFilter(
                    event.target.value as ModelAliasStatusFilter,
                  )
                }
                value={aliasStatusFilter}
              >
                <option value="all">全部状态</option>
                <option value="enabled">启用</option>
                <option value="disabled">停用</option>
              </select>
            </div>
          </div>

          <TableWrapper>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>请求模型</TableHead>
                  <TableHead>Copilot 目标模型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead className="w-[180px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAliases.length === 0 ? (
                  <TableRow>
                    <TableCell className="py-6 text-slate-500" colSpan={5}>
                      {aliases.data.length === 0
                        ? "还没有模型别名。"
                        : "没有匹配的模型别名。"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAliases.map((alias) => {
                    const isEditing = editingId === alias.id

                    return (
                      <TableRow key={alias.id}>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              onChange={(event) =>
                                setEditingDraft((current) => ({
                                  ...current,
                                  sourceModel: event.target.value,
                                }))
                              }
                              value={editingDraft.sourceModel}
                            />
                          ) : (
                            <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-800">
                              {alias.sourceModel}
                            </code>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              onChange={(event) =>
                                setEditingDraft((current) => ({
                                  ...current,
                                  targetModel: event.target.value,
                                }))
                              }
                              value={editingDraft.targetModel}
                            />
                          ) : (
                            <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-800">
                              {alias.targetModel}
                            </code>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <label className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-600">
                              <input
                                checked={editingDraft.enabled}
                                onChange={(event) =>
                                  setEditingDraft((current) => ({
                                    ...current,
                                    enabled: event.target.checked,
                                  }))
                                }
                                type="checkbox"
                              />
                              启用
                            </label>
                          ) : (
                            <Badge
                              className={cn(
                                alias.enabled
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-500",
                              )}
                            >
                              {alias.enabled ? "启用" : "停用"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatTimestamp(alias.updatedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {isEditing ? (
                              <>
                                <Button
                                  disabled={isSaving}
                                  onClick={() => handleUpdate(alias.id)}
                                  size="sm"
                                >
                                  保存
                                </Button>
                                <Button
                                  disabled={isSaving}
                                  onClick={() => setEditingId(null)}
                                  size="sm"
                                  variant="outline"
                                >
                                  取消
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  onClick={() => handleEditStart(alias)}
                                  size="sm"
                                  variant="outline"
                                >
                                  编辑
                                </Button>
                                <Button
                                  disabled={isSaving}
                                  onClick={() => handleDelete(alias.id)}
                                  size="sm"
                                  variant="ghost"
                                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                >
                                  删除
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableWrapper>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Copilot 目标模型</CardTitle>
              <CardDescription>
                这里列出当前从 Copilot
                拉到的可用目标模型。点击“填入目标模型”可直接写入目标模型输入框。
              </CardDescription>
            </div>
            <Button
              className="w-full md:w-auto"
              disabled={isRefreshingModels}
              onClick={() => void handleRefreshModels()}
              size="sm"
              variant="outline"
            >
              <RefreshCcw
                className={cn(
                  "mr-1.5 h-3.5 w-3.5",
                  isRefreshingModels && "animate-spin",
                )}
              />
              刷新模型清单
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {supportedModels.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              还没有拿到支持模型列表。
            </div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-3">
              {uniqueSupportedModels.map((model) => (
                <ModelCard
                  copiedId={copiedId}
                  copyModelId={copyModelId}
                  key={model.id}
                  model={model}
                  modelReasoningEffort={modelReasoningEfforts[model.id] ?? ""}
                  onReasoningEffortChange={handleReasoningEffortChange}
                  setDraft={setDraft}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ModelCard({
  copiedId,
  copyModelId,
  model,
  modelReasoningEffort,
  onReasoningEffortChange,
  setDraft,
}: {
  copiedId: string | null
  copyModelId: (id: string) => void
  model: SupportedModel
  modelReasoningEffort: "" | ModelReasoningEffort
  onReasoningEffortChange: (
    modelId: string,
    value: "" | ModelReasoningEffort,
  ) => Promise<void>
  setDraft: Dispatch<SetStateAction<AliasDraft>>
}) {
  const reasoningOptions = getReasoningOptions(model)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              Display Name
            </p>
            <p className="truncate text-sm font-semibold text-slate-950">
              {model.name}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              Model ID
            </p>
            <div className="flex items-center gap-1.5">
              <code className="break-all rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                {model.id}
              </code>
              <button
                className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                onClick={() => copyModelId(model.id)}
                title="复制 Model ID"
                type="button"
              >
                {copiedId === model.id ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
        <Button
          className="shrink-0"
          onClick={() =>
            setDraft((current) => ({
              ...current,
              targetModel: model.id,
            }))
          }
          size="sm"
          variant="outline"
        >
          填入
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge className="bg-slate-100 text-slate-600">{model.vendor}</Badge>
        <Badge className="bg-slate-100 text-slate-600">
          {model.capabilities.family}
        </Badge>
        {model.preview ? (
          <Badge className="bg-amber-50 text-amber-700">Preview</Badge>
        ) : null}
        {model.modelPickerEnabled ? (
          <Badge className="bg-emerald-50 text-emerald-700">允许</Badge>
        ) : (
          <Badge className="bg-slate-100 text-slate-500">不可选</Badge>
        )}
      </div>
      {model.modelPickerEnabled && reasoningOptions.length > 0 ? (
        <div className="mt-4 space-y-2">
          <label
            className="text-xs font-medium text-slate-600"
            htmlFor={`reasoning-effort-${model.id}`}
          >
            思考深度
          </label>
          <select
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
            id={`reasoning-effort-${model.id}`}
            onChange={(event) =>
              void onReasoningEffortChange(
                model.id,
                event.target.value as "" | ModelReasoningEffort,
              )
            }
            value={modelReasoningEffort}
          >
            <option value="">默认</option>
            {reasoningOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  )
}
