import type { Dispatch, SetStateAction } from "react"

import type { MappingDraft, ModelMappingRecord } from "../../lib/dashboard-api"

import { formatTimestamp } from "../../lib/format"
import { cn } from "../../lib/utils"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { TableCell, TableRow } from "../ui/table"

interface MappingRowProps {
  editingDraft: MappingDraft
  editingId: string | null
  isSaving: boolean
  mapping: ModelMappingRecord
  onDelete: (id: string) => void
  onEditStart: (mapping: ModelMappingRecord) => void
  onUpdate: (id: string) => void
  setEditingDraft: Dispatch<SetStateAction<MappingDraft>>
  setEditingId: Dispatch<SetStateAction<string | null>>
}

function MappingValueCell({
  isEditing,
  onChange,
  value,
}: {
  isEditing: boolean
  onChange: (nextValue: string) => void
  value: string
}) {
  if (isEditing) {
    return (
      <Input onChange={(event) => onChange(event.target.value)} value={value} />
    )
  }

  return (
    <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-800">
      {value}
    </code>
  )
}

function MappingStatusCell({
  enabled,
  isEditing,
  onChange,
}: {
  enabled: boolean
  isEditing: boolean
  onChange: (nextValue: boolean) => void
}) {
  if (isEditing) {
    return (
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          checked={enabled}
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        启用
      </label>
    )
  }

  return (
    <Badge
      className={cn(
        enabled
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-500",
      )}
    >
      {enabled ? "启用" : "停用"}
    </Badge>
  )
}

function MappingActionButtons({
  isEditing,
  isSaving,
  mapping,
  onDelete,
  onEditStart,
  onUpdate,
  setEditingId,
}: {
  isEditing: boolean
  isSaving: boolean
  mapping: ModelMappingRecord
  onDelete: (id: string) => void
  onEditStart: (mapping: ModelMappingRecord) => void
  onUpdate: (id: string) => void
  setEditingId: Dispatch<SetStateAction<string | null>>
}) {
  if (isEditing) {
    return (
      <>
        <Button
          disabled={isSaving}
          onClick={() => onUpdate(mapping.id)}
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
    )
  }

  return (
    <>
      <Button onClick={() => onEditStart(mapping)} size="sm" variant="outline">
        编辑
      </Button>
      <Button
        disabled={isSaving}
        onClick={() => onDelete(mapping.id)}
        size="sm"
        variant="ghost"
      >
        删除
      </Button>
    </>
  )
}

export function MappingRow({
  editingDraft,
  editingId,
  isSaving,
  mapping,
  onDelete,
  onEditStart,
  onUpdate,
  setEditingDraft,
  setEditingId,
}: MappingRowProps) {
  const isEditing = editingId === mapping.id

  return (
    <TableRow>
      <TableCell>
        <MappingValueCell
          isEditing={isEditing}
          onChange={(sourceModel) =>
            setEditingDraft((current) => ({
              ...current,
              sourceModel,
            }))
          }
          value={isEditing ? editingDraft.sourceModel : mapping.sourceModel}
        />
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Input
            onChange={(event) =>
              setEditingDraft((current) => ({
                ...current,
                displayName: event.target.value,
              }))
            }
            value={editingDraft.displayName}
          />
        ) : (
          mapping.displayName
        )}
      </TableCell>
      <TableCell>
        <MappingStatusCell
          enabled={isEditing ? editingDraft.enabled : mapping.enabled}
          isEditing={isEditing}
          onChange={(enabled) =>
            setEditingDraft((current) => ({
              ...current,
              enabled,
            }))
          }
        />
      </TableCell>
      <TableCell>{formatTimestamp(mapping.updatedAt)}</TableCell>
      <TableCell>
        <div className="flex gap-2">
          <MappingActionButtons
            isEditing={isEditing}
            isSaving={isSaving}
            mapping={mapping}
            onDelete={onDelete}
            onEditStart={onEditStart}
            onUpdate={onUpdate}
            setEditingId={setEditingId}
          />
        </div>
      </TableCell>
    </TableRow>
  )
}
