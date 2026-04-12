import { describe, expect, test } from "bun:test"

import { filterModelAliases } from "../dashboard/src/lib/model-alias-filter"

const aliases = [
  {
    id: "alias-1",
    sourceModel: "claude-sonnet",
    targetModel: "claude-sonnet-4.5",
    enabled: true,
    createdAt: "2026-04-12T10:00:00.000Z",
    updatedAt: "2026-04-12T10:00:00.000Z",
  },
  {
    id: "alias-2",
    sourceModel: "claude-opus",
    targetModel: "claude-opus-4.1",
    enabled: false,
    createdAt: "2026-04-12T10:01:00.000Z",
    updatedAt: "2026-04-12T10:01:00.000Z",
  },
]

describe("model alias filtering", () => {
  test("filters aliases by request model text case-insensitively", () => {
    const filtered = filterModelAliases(aliases, {
      query: "SONNET",
      status: "all",
    })

    expect(filtered.map((alias) => alias.id)).toEqual(["alias-1"])
  })

  test("filters aliases by enabled status", () => {
    const filtered = filterModelAliases(aliases, {
      query: "",
      status: "disabled",
    })

    expect(filtered.map((alias) => alias.id)).toEqual(["alias-2"])
  })
})
