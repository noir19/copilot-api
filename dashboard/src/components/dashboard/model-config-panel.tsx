import { useState } from "react"

import type { AliasesResponse, MappingsResponse } from "../../lib/dashboard-api"
import { cn } from "../../lib/utils"
import { Button } from "../ui/button"
import { MappingsPanel } from "./mappings-panel"
import { ModelAliasesPanel } from "./model-aliases-panel"

type ConfigSection = "aliases" | "mappings"

export function ModelConfigPanel({
  aliases,
  mappings,
  onChanged,
}: {
  aliases: AliasesResponse
  mappings: MappingsResponse
  onChanged: () => Promise<void>
}) {
  const [section, setSection] = useState<ConfigSection>("aliases")

  return (
    <div className="space-y-5">
      <div className="flex gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
        <Button
          className={cn(
            "flex-1 rounded-lg text-sm",
            section === "aliases" && "shadow-sm",
          )}
          onClick={() => setSection("aliases")}
          variant={section === "aliases" ? "default" : "ghost"}
        >
          模型别名
          <span className="ml-1.5 text-xs opacity-70">
            {aliases.meta.count}
          </span>
        </Button>
        <Button
          className={cn(
            "flex-1 rounded-lg text-sm",
            section === "mappings" && "shadow-sm",
          )}
          onClick={() => setSection("mappings")}
          variant={section === "mappings" ? "default" : "ghost"}
        >
          展示映射
          <span className="ml-1.5 text-xs opacity-70">
            {mappings.meta.count}
          </span>
        </Button>
      </div>

      {section === "aliases" ? (
        <ModelAliasesPanel aliases={aliases} onChanged={onChanged} />
      ) : (
        <MappingsPanel mappings={mappings} onChanged={onChanged} />
      )}
    </div>
  )
}
