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
        <CardTitle>Create mapping</CardTitle>
        <CardDescription>
          Save aliases into SQLite and reload the process cache immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-700"
            htmlFor="source-model"
          >
            Source model
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
            Display name
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
          Enable this mapping immediately
        </label>
        <Button
          disabled={
            isSaving
            || draft.sourceModel.trim().length === 0
            || draft.displayName.trim().length === 0
          }
          onClick={onCreate}
        >
          Save mapping
        </Button>
      </CardContent>
    </Card>
  )
}
