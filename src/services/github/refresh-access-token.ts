import {
  GITHUB_BASE_URL,
  GITHUB_CLIENT_ID,
  standardHeaders,
} from "~/lib/api-config"
import { HTTPError } from "~/lib/error"

import type { AccessTokenResponse } from "./poll-access-token"

export async function refreshAccessToken(
  refreshToken: string,
): Promise<AccessTokenResponse> {
  const response = await fetch(`${GITHUB_BASE_URL}/login/oauth/access_token`, {
    method: "POST",
    headers: standardHeaders(),
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    throw new HTTPError("Failed to refresh GitHub token", response)
  }

  return (await response.json()) as AccessTokenResponse
}
