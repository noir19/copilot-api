import consola from "consola"
import fs from "node:fs"

import { state } from "./state"

type ModelAliasMap = Record<string, string>

let aliases: ModelAliasMap = {}

const CONFIG_FILENAME = "model-aliases.json"

export function loadModelAliases(): void {
  const configPath = `${process.cwd()}/${CONFIG_FILENAME}`

  try {
    const raw = fs.readFileSync(configPath)
    aliases = JSON.parse(raw.toString()) as ModelAliasMap
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

  // 3. Dash-to-dot: replace the last dash before a numeric suffix with a dot
  const dotVariant = requested.replace(/^(.*\d)-(\d+)(-.+)?$/, "$1.$2$3")
  if (
    dotVariant !== requested
    && (availableIds.length === 0 || availableIds.includes(dotVariant))
  ) {
    logModelResolution(requested, dotVariant)
    return dotVariant
  }

  // 4. Passthrough
  consola.info(`Model: ${requested}`)
  return requested
}

function logModelResolution(from: string, to: string): void {
  consola.info(`Model: ${from} → ${to}`)
}
