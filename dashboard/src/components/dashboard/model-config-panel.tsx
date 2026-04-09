import type { AliasesResponse, SupportedModel } from "../../lib/dashboard-api"
import { ModelAliasesPanel } from "./model-aliases-panel"

export function ModelConfigPanel({
  aliases,
  onChanged,
  supportedModels,
}: {
  aliases: AliasesResponse
  onChanged: () => Promise<void>
  supportedModels: Array<SupportedModel>
}) {
  return (
    <ModelAliasesPanel
      aliases={aliases}
      onChanged={onChanged}
      supportedModels={supportedModels}
    />
  )
}
