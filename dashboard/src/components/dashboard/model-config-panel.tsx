import type { AliasesResponse } from "../../lib/dashboard-api"
import { ModelAliasesPanel } from "./model-aliases-panel"

export function ModelConfigPanel({
  aliases,
  onChanged,
}: {
  aliases: AliasesResponse
  onChanged: () => Promise<void>
}) {
  return <ModelAliasesPanel aliases={aliases} onChanged={onChanged} />
}
