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
        <CardTitle>展示映射</CardTitle>
        <CardDescription>
          这张表只影响日志、统计和面板里的模型展示名称。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Badge>版本 {mappings.meta.version}</Badge>
          <Badge>共 {mappings.meta.count} 条</Badge>
          <Badge>启用 {mappings.meta.enabledCount} 条</Badge>
          <Badge>最近加载 {formatTimestamp(mappings.meta.loadedAt)}</Badge>
        </div>

        <TableWrapper>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>原始模型</TableHead>
                <TableHead>展示名称</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead className="w-[180px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.data.length === 0 ? (
                <TableRow>
                  <TableCell className="py-6 text-slate-500" colSpan={5}>
                    还没有展示映射。
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
