import { existsSync } from "node:fs"
import { resolve } from "node:path"

function getDashboardDistPath(): string | null {
  const candidates = [
    resolve(process.cwd(), "dist", "dashboard"),
    resolve(process.cwd(), "dashboard", "dist"),
    resolve(import.meta.dir, "..", "..", "..", "dist", "dashboard"),
    resolve(import.meta.dir, "..", "..", "..", "dashboard", "dist"),
  ]

  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

function dashboardUnavailableResponse(): Response {
  return new Response(
    "Dashboard assets are not built yet. Run `bun run build:dashboard` first.",
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
      status: 503,
    },
  )
}

export function serveDashboardIndex(): Response {
  const dashboardDistPath = getDashboardDistPath()
  if (!dashboardDistPath) {
    return dashboardUnavailableResponse()
  }

  return new Response(Bun.file(resolve(dashboardDistPath, "index.html")), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  })
}

export async function serveDashboardAsset(pathname: string): Promise<Response> {
  const dashboardDistPath = getDashboardDistPath()
  if (!dashboardDistPath) {
    return dashboardUnavailableResponse()
  }

  const assetPath = pathname.replace("/dashboard/", "")
  const filePath = resolve(dashboardDistPath, assetPath)
  if (!filePath.startsWith(dashboardDistPath)) {
    return new Response("Not found", { status: 404 })
  }

  const file = Bun.file(filePath)

  if (!(await file.exists())) {
    return new Response("Not found", { status: 404 })
  }

  const headers = file.type ? { "Content-Type": file.type } : undefined
  return new Response(file, { headers })
}
