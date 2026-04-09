const FALLBACK = "1.115.0"

export async function getVSCodeVersion(): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => {
    controller.abort()
  }, 5000)

  try {
    const response = await fetch(
      "https://update.code.visualstudio.com/api/releases/stable",
      { signal: controller.signal },
    )

    const body: unknown = await response.json()
    const releases = Array.isArray(body)
      ? body.filter((item): item is string => typeof item === "string")
      : []

    if (releases.length > 0 && /^\d+\.\d+\.\d+$/.test(releases[0])) {
      return releases[0]
    }

    return FALLBACK
  } catch {
    return FALLBACK
  } finally {
    clearTimeout(timeout)
  }
}
