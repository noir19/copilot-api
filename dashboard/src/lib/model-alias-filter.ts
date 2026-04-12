import type { ModelAliasRecord } from "./dashboard-api"

export type ModelAliasStatusFilter = "all" | "enabled" | "disabled"

export interface ModelAliasFilter {
  query: string
  status: ModelAliasStatusFilter
}

export function filterModelAliases(
  aliases: Array<ModelAliasRecord>,
  filter: ModelAliasFilter,
): Array<ModelAliasRecord> {
  const query = filter.query.trim().toLowerCase()

  return aliases.filter((alias) => {
    const matchesQuery =
      query.length === 0 || alias.sourceModel.toLowerCase().includes(query)
    const matchesStatus =
      filter.status === "all" ||
      (filter.status === "enabled" && alias.enabled) ||
      (filter.status === "disabled" && !alias.enabled)

    return matchesQuery && matchesStatus
  })
}
