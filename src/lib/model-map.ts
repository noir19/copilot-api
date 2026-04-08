import fs from "node:fs/promises"
import path from "node:path"
import consola from "consola"

import { state } from "./state"

type ModelAliasMap = Record<string, string>

let aliases: ModelAliasMap = {}

const CONFIG_FILENAME = "model-aliases.json"

export async function loadModelAliases(): Promise<void> {
  const configPath = path.resolve(CONFIG_FILENAME)

  try {
    const raw = await fs.readFile(configPath)
    aliases = JSON.parse(raw.toString("utf8")) as ModelAliasMap
    consola.info(
      `Loaded ${Object.keys(aliases).length} model alias(es) from ${CONFIG_FILENAME}`,
    )
  } catch {
    aliases = {}
    consola.debug(`No ${CONFIG_FILENAME} found, using dynamic matching only`)
  }
}

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
  // 1. Config alias
  if (aliases[requested]) {
    logModelResolution(requested, aliases[requested])
    return aliases[requested]
  }

  const availableIds =
    state.models?.data.map((m) => m.id) ?? ([] as Array<string>)

  // 2. Exact match
  if (availableIds.includes(requested)) {
    consola.info(`Model: ${requested}`)
    return requested
  }

  // 3. Match against available models by converting their dots to dashes
  //    e.g. available "claude-haiku-4.5" → dash form "claude-haiku-4-5"
  //    then check if requested equals or starts with "claude-haiku-4-5-"
  //    This handles: claude-haiku-4-5-20251001 → claude-haiku-4.5
  //                  claude-sonnet-4-6 → claude-sonnet-4.6
  //                  claude-opus-4-6-fast → claude-opus-4.6-fast
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

  // 4. Passthrough
  consola.info(`Model: ${requested}`)
  return requested
}

function logModelResolution(from: string, to: string): void {
  consola.info(`Model: ${from} → ${to}`)
}
