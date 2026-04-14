import type { ServerHandler } from "srvx"

export const BUN_IDLE_TIMEOUT_SECONDS = 300

export function createServeOptions(fetch: ServerHandler, port: number) {
  return {
    fetch,
    port,
    bun: {
      idleTimeout: BUN_IDLE_TIMEOUT_SECONDS,
    },
  }
}
