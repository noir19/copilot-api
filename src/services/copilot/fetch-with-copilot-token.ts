import { HTTPError } from "~/lib/error"
import { state } from "~/lib/state"
import { isExpiredTokenResponse, refreshCopilotToken } from "~/lib/token"

export async function fetchWithCopilotToken(
  request: () => Promise<Response>,
  errorMessage: string,
): Promise<Response> {
  if (!state.copilotToken) {
    await refreshCopilotToken()
  }

  let response = await request()
  if (response.ok) {
    return response
  }

  if (await isExpiredTokenResponse(response)) {
    await refreshCopilotToken(true)
    response = await request()

    if (response.ok) {
      return response
    }
  }

  throw new HTTPError(errorMessage, response)
}
