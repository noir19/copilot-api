import { copilotBaseUrl, copilotHeaders } from "~/lib/api-config"
import { state } from "~/lib/state"
import { fetchWithCopilotToken } from "~/services/copilot/fetch-with-copilot-token"

export const createEmbeddings = async (payload: EmbeddingRequest) => {
  const response = await fetchWithCopilotToken(
    () =>
      fetch(`${copilotBaseUrl(state)}/embeddings`, {
        method: "POST",
        headers: copilotHeaders(state),
        body: JSON.stringify(payload),
      }),
    "Failed to create embeddings",
  )

  return (await response.json()) as EmbeddingResponse
}

export interface EmbeddingRequest {
  input: string | Array<string>
  model: string
}

export interface Embedding {
  object: string
  embedding: Array<number>
  index: number
}

export interface EmbeddingResponse {
  object: string
  data: Array<Embedding>
  model: string
  usage: {
    prompt_tokens: number
    total_tokens: number
  }
}
