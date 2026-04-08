import { useState } from "react"

import {
  type AliasDraft,
  type AliasesResponse,
  createAlias,
  deleteAlias,
  EMPTY_ALIAS_DRAFT,
  type ModelAliasRecord,
  updateAlias,
} from "../../lib/dashboard-api"
import { formatTimestamp } from "../../lib/format"
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

export function ModelAliasesPanel({
  aliases,
  onChanged,
}: {
  aliases: AliasesResponse
  onChanged: () => Promise<void>
}) {
  const [draft, setDraft] = useState<AliasDraft>(EMPTY_ALIAS_DRAFT)
  const [editingDraft, setEditingDraft] =
    useState<AliasDraft>(EMPTY_ALIAS_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>模型别名</CardTitle>
            <CardDescription>
              这张表直接控制请求模型如何映射到目标模型，已经不再依赖
              `model-aliases.json`。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Badge>版本 {aliases.meta.version}</Badge>
              <Badge>共 {aliases.meta.count} 条</Badge>
              <Badge>启用 {aliases.meta.enabledCount} 条</Badge>
              <Badge>最近加载 {formatTimestamp(aliases.meta.loadedAt)}</Badge>
            </div>

            <TableWrapper>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>源模型</TableHead>
                    <TableHead>目标模型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>更新时间</TableHead>
                    <TableHead className="w-[180px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aliases.data.length === 0 ? (
                    <TableRow>
                      <TableCell className="py-6 text-slate-500" colSpan={5}>
                        还没有模型别名。
                      </TableCell>
                    </TableRow>
                  ) : (
                    aliases.data.map((alias) => {
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
                              <label className="flex items-center gap-2 text-sm text-slate-600">
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
                          <TableCell>
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
            <CardTitle>新增模型别名</CardTitle>
            <CardDescription>
              保存后立即写入 SQLite，并刷新运行时缓存。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="model-alias-source-model"
              >
                源模型
              </label>
              <Input
                id="model-alias-source-model"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    sourceModel: event.target.value,
                  }))
                }
                placeholder="haiku"
                value={draft.sourceModel}
              />
            </div>
            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-700"
                htmlFor="model-alias-target-model"
              >
                目标模型
              </label>
              <Input
                id="model-alias-target-model"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    targetModel: event.target.value,
                  }))
                }
                placeholder="claude-haiku-4.5"
                value={draft.targetModel}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
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
              disabled={
                isSaving ||
                draft.sourceModel.trim().length === 0 ||
                draft.targetModel.trim().length === 0
              }
              onClick={handleCreate}
            >
              保存别名
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
