import { type FSWatcher, watch } from "node:fs"
import fs from "node:fs/promises"
import path from "node:path"
import consola from "consola"

import { PATHS } from "~/lib/paths"
import { getCopilotToken } from "~/services/github/get-copilot-token"
import { getDeviceCode } from "~/services/github/get-device-code"
import { getGitHubUser } from "~/services/github/get-user"
import {
  type AccessTokenResponse,
  pollAccessToken,
} from "~/services/github/poll-access-token"
import { refreshAccessToken } from "~/services/github/refresh-access-token"

import { HTTPError } from "./error"
import { state } from "./state"

const COPILOT_TOKEN_REFRESH_BUFFER_MS = 60_000
const GITHUB_TOKEN_REFRESH_BUFFER_MS = 5 * 60_000
const WATCH_DEBOUNCE_MS = 250
const REFRESH_RETRY_DELAY_MS = 60_000

interface StoredGitHubToken {
  version: 1
  accessToken: string
  refreshToken?: string
  accessTokenExpiresAt?: string
  refreshTokenExpiresAt?: string
  updatedAt: string
}

interface SetupGitHubTokenOptions {
  force?: boolean
  githubToken?: string
  githubTokenFile?: string
}

interface GitHubTokenReloadResult {
  loaded: boolean
  changed: boolean
}

let currentGitHubToken: StoredGitHubToken | undefined
let githubTokenWatcher: FSWatcher | undefined
let githubTokenWatchDebounce: ReturnType<typeof setTimeout> | undefined
let githubTokenRefreshPromise: Promise<string> | undefined
let copilotTokenRefreshPromise: Promise<string> | undefined
let copilotTokenRefreshTimer: ReturnType<typeof setTimeout> | undefined

/**
 * Deduplicates concurrent calls to the same async operation.
 * If a promise is already in flight, returns it instead of starting a new one.
 */
const dedup = async <T>(
  getRef: () => Promise<T> | undefined,
  setRef: (p: Promise<T> | undefined) => void,
  fn: () => Promise<T>,
): Promise<T> => {
  const existing = getRef()
  if (existing) return existing

  const promise = fn()
  setRef(promise)

  try {
    return await promise
  } finally {
    if (getRef() === promise) setRef(undefined)
  }
}

const readFileIfExists = async (filePath: string) => {
  try {
    return await fs.readFile(filePath, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return ""
    }

    throw error
  }
}

const toIsoDate = (secondsFromNow?: number) =>
  secondsFromNow
    ? new Date(Date.now() + secondsFromNow * 1000).toISOString()
    : undefined

const normalizeGitHubToken = (
  token: AccessTokenResponse | StoredGitHubToken | string,
): StoredGitHubToken | undefined => {
  if (typeof token === "string") {
    const accessToken = token.trim()
    if (!accessToken) {
      return undefined
    }

    return {
      version: 1,
      accessToken,
      updatedAt: new Date().toISOString(),
    }
  }

  if ("access_token" in token) {
    return {
      version: 1,
      accessToken: token.access_token.trim(),
      refreshToken: token.refresh_token?.trim(),
      accessTokenExpiresAt: toIsoDate(token.expires_in),
      refreshTokenExpiresAt: toIsoDate(token.refresh_token_expires_in),
      updatedAt: new Date().toISOString(),
    }
  }

  const accessToken = token.accessToken.trim()

  if (!accessToken) {
    return undefined
  }

  return {
    version: 1,
    accessToken,
    refreshToken: token.refreshToken?.trim() || undefined,
    accessTokenExpiresAt: token.accessTokenExpiresAt,
    refreshTokenExpiresAt: token.refreshTokenExpiresAt,
    updatedAt: token.updatedAt || new Date().toISOString(),
  }
}

const parseGitHubTokenContent = (content: string) => {
  const trimmed = content.trim()
  if (!trimmed) {
    return undefined
  }

  try {
    const parsed = JSON.parse(trimmed) as
      | Partial<StoredGitHubToken>
      | {
          access_token?: string
          refresh_token?: string
          expires_at?: string
          refresh_token_expires_at?: string
        }

    if ("accessToken" in parsed && typeof parsed.accessToken === "string") {
      return normalizeGitHubToken(parsed as StoredGitHubToken)
    }

    if ("access_token" in parsed && typeof parsed.access_token === "string") {
      return normalizeGitHubToken({
        version: 1,
        accessToken: parsed.access_token,
        refreshToken:
          typeof parsed.refresh_token === "string"
            ? parsed.refresh_token
            : undefined,
        accessTokenExpiresAt:
          typeof parsed.expires_at === "string" ? parsed.expires_at : undefined,
        refreshTokenExpiresAt:
          typeof parsed.refresh_token_expires_at === "string"
            ? parsed.refresh_token_expires_at
            : undefined,
        updatedAt: new Date().toISOString(),
      })
    }
  } catch {
    return normalizeGitHubToken(trimmed)
  }

  return undefined
}

const readGitHubTokenFromPath = async (filePath: string) =>
  parseGitHubTokenContent(await readFileIfExists(filePath))

const writeGitHubToken = async (
  token: StoredGitHubToken,
  filePath: string = PATHS.GITHUB_TOKEN_PATH,
) => {
  await fs.writeFile(filePath, `${JSON.stringify(token, null, 2)}\n`)
}

const isExpiredOrMissingSoon = (expiresAt?: string, bufferMs: number = 0) => {
  if (!expiresAt) {
    return false
  }

  return new Date(expiresAt).getTime() - Date.now() <= bufferMs
}

const canRefreshGitHubToken = (token: StoredGitHubToken | undefined) =>
  Boolean(
    token?.refreshToken &&
      !isExpiredOrMissingSoon(
        token.refreshTokenExpiresAt,
        GITHUB_TOKEN_REFRESH_BUFFER_MS,
      ),
  )

const tokensDiffer = (
  currentToken: StoredGitHubToken | undefined,
  nextToken: StoredGitHubToken | undefined,
) =>
  currentToken?.accessToken !== nextToken?.accessToken ||
  currentToken?.refreshToken !== nextToken?.refreshToken ||
  currentToken?.accessTokenExpiresAt !== nextToken?.accessTokenExpiresAt ||
  currentToken?.refreshTokenExpiresAt !== nextToken?.refreshTokenExpiresAt

const scheduleCopilotTokenRefresh = (delayMs: number) => {
  if (copilotTokenRefreshTimer) {
    clearTimeout(copilotTokenRefreshTimer)
  }

  copilotTokenRefreshTimer = setTimeout(
    () => {
      void refreshCopilotToken(true).catch((error: unknown) => {
        consola.error("Failed to refresh Copilot token:", error)
        scheduleCopilotTokenRefresh(REFRESH_RETRY_DELAY_MS)
      })
    },
    Math.max(delayMs, 30_000),
  )
}

const applyGitHubToken = async (
  token: StoredGitHubToken,
  options?: {
    persist?: boolean
    logSource?: string
    refreshCopilot?: boolean
  },
) => {
  currentGitHubToken = token
  state.githubToken = token.accessToken

  if (options?.persist ?? true) {
    await writeGitHubToken(token)
  }

  if (options?.logSource) {
    consola.info(`Loaded GitHub token from ${options.logSource}`)
  }

  if (state.showToken) {
    consola.info("GitHub token:", token.accessToken)
  }

  if (options?.refreshCopilot) {
    try {
      await refreshCopilotToken(true)
    } catch (error: unknown) {
      consola.warn(
        "Reloaded GitHub token, but Copilot token refresh failed:",
        error,
      )
    }
  }
}

const refreshGitHubToken = async () => {
  const refreshToken = currentGitHubToken?.refreshToken
  if (!refreshToken) {
    throw new Error("GitHub refresh token not found")
  }

  return dedup(
    () => githubTokenRefreshPromise,
    (p) => {
      githubTokenRefreshPromise = p
    },
    async () => {
      const response = await refreshAccessToken(refreshToken)
      const nextToken = normalizeGitHubToken(response)

      if (!nextToken) {
        throw new Error("Failed to normalize refreshed GitHub token")
      }

      await applyGitHubToken(nextToken, { logSource: "GitHub refresh flow" })
      return nextToken.accessToken
    },
  )
}

const reloadGitHubTokenFromFile = async (
  refreshCopilot: boolean = false,
): Promise<GitHubTokenReloadResult> => {
  if (!state.githubTokenFile) {
    return { loaded: false, changed: false }
  }

  const nextToken = await readGitHubTokenFromPath(state.githubTokenFile)
  if (!nextToken) {
    return { loaded: false, changed: false }
  }

  const changed = tokensDiffer(currentGitHubToken, nextToken)
  if (!changed) {
    return { loaded: true, changed: false }
  }

  await applyGitHubToken(nextToken, {
    logSource: state.githubTokenFile,
    refreshCopilot,
  })
  return { loaded: true, changed: true }
}

const ensureGitHubTokenFresh = async () => {
  if (!currentGitHubToken) {
    await reloadGitHubTokenFromFile()
  }

  if (
    currentGitHubToken &&
    isExpiredOrMissingSoon(
      currentGitHubToken.accessTokenExpiresAt,
      GITHUB_TOKEN_REFRESH_BUFFER_MS,
    ) &&
    canRefreshGitHubToken(currentGitHubToken)
  ) {
    await refreshGitHubToken()
  }
}

const recoverGitHubToken = async () => {
  const reloaded = await reloadGitHubTokenFromFile()
  if (reloaded.changed) {
    return true
  }

  if (canRefreshGitHubToken(currentGitHubToken)) {
    await refreshGitHubToken()
    return true
  }

  return false
}

const startGitHubTokenWatcher = (filePath: string) => {
  if (githubTokenWatcher || !filePath) {
    return
  }

  githubTokenWatcher = watch(path.dirname(filePath), (_eventType, filename) => {
    if (filename && filename !== path.basename(filePath)) {
      return
    }

    if (githubTokenWatchDebounce) {
      clearTimeout(githubTokenWatchDebounce)
    }

    githubTokenWatchDebounce = setTimeout(() => {
      void reloadGitHubTokenFromFile(true).catch((error: unknown) => {
        consola.warn("Failed to reload GitHub token from file:", error)
      })
    }, WATCH_DEBOUNCE_MS)
  })
}

const authenticateWithDeviceFlow = async () => {
  consola.info("Not logged in, getting new access token")
  const response = await getDeviceCode()
  consola.debug("Device code response:", response)

  consola.info(
    `Please enter the code "${response.user_code}" in ${response.verification_uri}`,
  )

  const tokenResponse = await pollAccessToken(response)
  const token = normalizeGitHubToken(tokenResponse)

  if (!token) {
    throw new Error("Failed to normalize GitHub token from device flow")
  }

  await applyGitHubToken(token, { logSource: PATHS.GITHUB_TOKEN_PATH })
}

async function logUser() {
  try {
    const user = await getGitHubUser()
    consola.info(`Logged in as ${user.login}`)
  } catch (error) {
    if (error instanceof HTTPError && (await recoverGitHubToken())) {
      const user = await getGitHubUser()
      consola.info(`Logged in as ${user.login}`)
      return
    }

    throw error
  }
}

export async function isExpiredTokenResponse(response: Response) {
  if (response.status !== 401) {
    return false
  }

  const body = (await response.clone().text()).toLowerCase()
  return body.includes("token expired")
}

const fetchAndApplyCopilotToken = async () => {
  const { token, refresh_in } = await getCopilotToken()
  state.copilotToken = token

  consola.debug("GitHub Copilot token fetched successfully")
  if (state.showToken) {
    consola.info("Copilot token:", token)
  }

  scheduleCopilotTokenRefresh(
    refresh_in * 1000 - COPILOT_TOKEN_REFRESH_BUFFER_MS,
  )
  return token
}

export const refreshCopilotToken = async (_force: boolean = false) => {
  return dedup(
    () => copilotTokenRefreshPromise,
    (p) => {
      copilotTokenRefreshPromise = p
    },
    async () => {
      await ensureGitHubTokenFresh()

      try {
        return await fetchAndApplyCopilotToken()
      } catch (error) {
        if (error instanceof HTTPError && (await recoverGitHubToken())) {
          return await fetchAndApplyCopilotToken()
        }

        throw error
      }
    },
  )
}

export const setupCopilotToken = async () => {
  await refreshCopilotToken(true)
}

const loadConfiguredGitHubToken = async (
  options?: SetupGitHubTokenOptions,
): Promise<boolean> => {
  state.githubTokenFile = options?.githubTokenFile || process.env.GH_TOKEN_FILE

  if (!state.githubTokenFile || options?.force) {
    return false
  }

  startGitHubTokenWatcher(state.githubTokenFile)

  const loadedFromWatchedFile = await reloadGitHubTokenFromFile()
  if (!loadedFromWatchedFile.loaded) {
    return false
  }

  await ensureGitHubTokenFresh()
  await logUser()
  return true
}

const loadCliGitHubToken = async (options?: SetupGitHubTokenOptions) => {
  const githubToken = options?.githubToken

  if (options?.force || !githubToken) {
    return false
  }

  const token = normalizeGitHubToken(githubToken)
  if (!token) {
    throw new Error("Provided GitHub token is empty")
  }

  await applyGitHubToken(token, {
    persist: false,
    logSource: "CLI option",
  })
  await logUser()
  return true
}

const loadPersistedGitHubToken = async (force: boolean = false) => {
  if (force) {
    return false
  }

  const storedToken = await readGitHubTokenFromPath(PATHS.GITHUB_TOKEN_PATH)
  if (!storedToken) {
    return false
  }

  await applyGitHubToken(storedToken, {
    logSource: PATHS.GITHUB_TOKEN_PATH,
  })
  await ensureGitHubTokenFresh()
  await logUser()
  return true
}

export async function setupGitHubToken(
  options?: SetupGitHubTokenOptions,
): Promise<void> {
  try {
    if (await loadConfiguredGitHubToken(options)) return
    if (await loadCliGitHubToken(options)) return
    if (await loadPersistedGitHubToken(options?.force)) return

    await authenticateWithDeviceFlow()
    await logUser()
  } catch (error) {
    if (error instanceof HTTPError) {
      consola.error("Failed to get GitHub token:", await error.response.text())
      throw error
    }

    consola.error("Failed to get GitHub token:", error)
    throw error
  }
}
