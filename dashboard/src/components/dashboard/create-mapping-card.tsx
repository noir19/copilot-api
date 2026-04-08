import type { Dispatch, SetStateAction } from "react"

import type { MappingDraft } from "../../lib/dashboard-api"

import { Button } from "../ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card"
import { Input } from "../ui/input"

export function CreateMappingCard({
  draft,
  isSaving,
  onCreate,
  setDraft,
}: {
  draft: MappingDraft
  isSaving: boolean
  onCreate: () => void
  setDraft: Dispatch<SetStateAction<MappingDraft>>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>新增展示映射</CardTitle>
        <CardDescription>
          只影响日志和统计里的展示名称，不影响真实请求的目标模型。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="source-model"
          >
            原始模型
          </label>
          <Input
            id="source-model"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                sourceModel: event.target.value,
              }))
            }
            placeholder="claude-sonnet-4"
            value={draft.sourceModel}
          />
        </div>
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="display-name"
          >
            展示名称
          </label>
          <Input
            id="display-name"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                displayName: event.target.value,
              }))
            }
            placeholder="Claude Sonnet 4"
            value={draft.displayName}
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
            draft.displayName.trim().length === 0
          }
          onClick={onCreate}
        >
          保存映射
        </Button>
      </CardContent>
    </Card>
  )
}
