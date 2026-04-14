import { describe, expect, test } from "bun:test"
import type { ServerHandler } from "srvx"

import { createServeOptions } from "~/lib/serve-options"

describe("start server options", () => {
  test("configures Bun idle timeout for long-running model requests", () => {
    const fetch: ServerHandler = () => new Response("ok")
    const options = createServeOptions(fetch, 4141)

    expect(options.port).toBe(4141)
    expect(options.fetch).toBe(fetch)
    expect(options.bun?.idleTimeout).toBe(255)
  })
})
