import type { Dispatch, SetStateAction } from "react"

import type {
  MappingDraft,
  MappingsResponse,
  ModelMappingRecord,
} from "../../lib/dashboard-api"

import { formatTimestamp } from "../../lib/format"
import { Badge } from "../ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "../ui/table"
import { MappingRow } from "./mapping-row"

export function MappingsTableCard({
  editingDraft,
  editingId,
  isSaving,
  mappings,
  onDelete,
  onEditStart,
  onUpdate,
  setEditingDraft,
  setEditingId,
}: {
  editingDraft: MappingDraft
  editingId: string | null
  isSaving: boolean
  mappings: MappingsResponse
  onDelete: (id: string) => void
  onEditStart: (mapping: ModelMappingRecord) => void
  onUpdate: (id: string) => void
  setEditingDraft: Dispatch<SetStateAction<MappingDraft>>
  setEditingId: Dispatch<SetStateAction<string | null>>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active model mappings</CardTitle>
        <CardDescription>
          These names are applied from the in-memory cache on the request path.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Badge>version {mappings.meta.version}</Badge>
          <Badge>{mappings.meta.count} total</Badge>
          <Badge>{mappings.meta.enabledCount} enabled</Badge>
          <Badge>loaded {formatTimestamp(mappings.meta.loadedAt)}</Badge>
        </div>

        <TableWrapper>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source model</TableHead>
                <TableHead>Display name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[180px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.data.length === 0 ? (
                <TableRow>
                  <TableCell className="py-6 text-slate-500" colSpan={5}>
                    No model mappings yet.
                  </TableCell>
                </TableRow>
              ) : (
                mappings.data.map((mapping) => (
                  <MappingRow
                    editingDraft={editingDraft}
                    editingId={editingId}
                    isSaving={isSaving}
                    key={mapping.id}
                    mapping={mapping}
                    onDelete={onDelete}
                    onEditStart={onEditStart}
                    onUpdate={onUpdate}
                    setEditingDraft={setEditingDraft}
                    setEditingId={setEditingId}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableWrapper>
      </CardContent>
    </Card>
  )
}
