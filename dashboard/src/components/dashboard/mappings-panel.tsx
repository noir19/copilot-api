import { useState } from "react"

import {
  createMapping,
  deleteMapping,
  EMPTY_DRAFT,
  type MappingDraft,
  type MappingsResponse,
  type ModelMappingRecord,
  updateMapping,
} from "../../lib/dashboard-api"
import { CreateMappingCard } from "./create-mapping-card"
import { MappingsTableCard } from "./mappings-table-card"

export function MappingsPanel({
  mappings,
  onChanged,
}: {
  mappings: MappingsResponse
  onChanged: () => Promise<void>
}) {
  const [draft, setDraft] = useState<MappingDraft>(EMPTY_DRAFT)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState<MappingDraft>(EMPTY_DRAFT)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function withRefresh(action: () => Promise<void>) {
    setIsSaving(true)
    setError(null)

    try {
      await action()
      await onChanged()
    } catch (actionError) {
      setError(
        actionError instanceof Error ? actionError.message : "展示映射更新失败",
      )
    } finally {
      setIsSaving(false)
    }
  }

  function handleCreate() {
    void withRefresh(async () => {
      await createMapping(draft)
      setDraft(EMPTY_DRAFT)
    })
  }

  function handleDelete(id: string) {
    void withRefresh(async () => {
      await deleteMapping(id)
    })
  }

  function handleUpdate(id: string) {
    void withRefresh(async () => {
      await updateMapping(id, editingDraft)
      setEditingId(null)
    })
  }

  function handleEditStart(mapping: ModelMappingRecord) {
    setEditingId(mapping.id)
    setEditingDraft({
      displayName: mapping.displayName,
      enabled: mapping.enabled,
      sourceModel: mapping.sourceModel,
    })
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <MappingsTableCard
          editingDraft={editingDraft}
          editingId={editingId}
          isSaving={isSaving}
          mappings={mappings}
          onDelete={handleDelete}
          onEditStart={handleEditStart}
          onUpdate={handleUpdate}
          setEditingDraft={setEditingDraft}
          setEditingId={setEditingId}
        />
        <CreateMappingCard
          draft={draft}
          isSaving={isSaving}
          onCreate={handleCreate}
          setDraft={setDraft}
        />
      </div>
    </div>
  )
}
