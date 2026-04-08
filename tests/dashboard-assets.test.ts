import { afterEach, describe, expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"

import {
  serveDashboardAsset,
  serveDashboardIndex,
} from "~/routes/dashboard/assets"

const originalCwd = process.cwd()
const tempDirs: Array<string> = []

afterEach(() => {
  process.chdir(originalCwd)

  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { force: true, recursive: true })
  }
})

describe("dashboard assets", () => {
  test("serves built index and static asset from dist/dashboard", async () => {
    const tempDir = mkdtempSync(join(process.cwd(), "tmp-dashboard-assets-"))
    tempDirs.push(tempDir)

    const dashboardDist = join(tempDir, "dist", "dashboard", "assets")
    mkdirSync(dashboardDist, { recursive: true })

    await Bun.write(
      join(tempDir, "dist", "dashboard", "index.html"),
      "<html>ok</html>",
    )
    await Bun.write(join(dashboardDist, "app.js"), "console.log('ok')")

    process.chdir(tempDir)

    const indexResponse = serveDashboardIndex()
    expect(indexResponse.status).toBe(200)
    expect(await indexResponse.text()).toContain("ok")

    const assetResponse = await serveDashboardAsset("/dashboard/assets/app.js")
    expect(assetResponse.status).toBe(200)
    expect(await assetResponse.text()).toContain("console.log")
  })

  test("blocks directory traversal attempts", async () => {
    const tempDir = mkdtempSync(join(process.cwd(), "tmp-dashboard-assets-"))
    tempDirs.push(tempDir)
    mkdirSync(join(tempDir, "dist", "dashboard"), { recursive: true })
    process.chdir(tempDir)

    const response = await serveDashboardAsset("/dashboard/../../secrets.txt")
    expect(response.status).toBe(404)
  })
})
