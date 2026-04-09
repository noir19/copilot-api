import consola from "consola"

import { getDashboardMetaRepository, getModelAliasStore } from "~/db/runtime"

import { state } from "./state"

/**
 * Resolve a requested model name to an available model.
 *
 * Priority:
 * 1. Explicit alias from config file
 * 2. Exact match in available models
 * 3. Dash-to-dot version conversion (e.g. claude-sonnet-4-6 → claude-sonnet-4.6)
 * 4. Passthrough (return original)
 */
export function resolveModelName(requested: string): string {
  // 1. SQLite alias
  const aliasedModel = getModelAliasStore().resolveTargetModel(requested)
  if (aliasedModel !== requested) {
    logModelResolution(requested, aliasedModel)
    return aliasedModel
  }

  const availableIds =
    state.models?.data.map((m) => m.id) ?? ([] as Array<string>)

  // 2. Exact match
  if (availableIds.includes(requested)) {
    consola.info(`Model: ${requested}`)
    return requested
  }

  // 3. Dash-to-dot conversion (can be disabled via dashboard settings)
  const dashToDotEnabled =
    getDashboardMetaRepository().get("dash_to_dot_enabled") !== "false"

  if (dashToDotEnabled) {
    let bestMatch = ""
    let bestMatchLen = 0
    for (const id of availableIds) {
      const dashForm = id.replaceAll(".", "-")
      const isMatch =
        requested === dashForm || requested.startsWith(`${dashForm}-`)
      if (isMatch && dashForm.length > bestMatchLen) {
        bestMatch = id
        bestMatchLen = dashForm.length
      }
    }

    if (bestMatch) {
      logModelResolution(requested, bestMatch)
      return bestMatch
    }
  }

  // 4. Passthrough
  consola.info(`Model: ${requested}`)
  return requested
}

function logModelResolution(from: string, to: string): void {
  consola.info(`Model: ${from} → ${to}`)
}
