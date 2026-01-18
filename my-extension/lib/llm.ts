/// <reference types="chrome" />

type ConversationTurn = {
  role: "buyer" | "seller"
  text: string
}

export type Listing = {
  id?: string
  title?: string
  targetPrice?: string
  priceReason?: string
  strategy?: string
}

type LlmConfig = {
  apiKey: string
  endpoint: string
  model: string
  systemPrompt: string
}

const DEFAULT_MODEL = "gemini-2.0-flash"

function getConfig(): Promise<LlmConfig> {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ["llm_api_key", "llm_endpoint", "llm_model", "llm_system_prompt"],
      (res) => {
        resolve({
          apiKey: res.llm_api_key || "",
          endpoint: res.llm_endpoint || "",
          model: res.llm_model || DEFAULT_MODEL,
          systemPrompt: res.llm_system_prompt || ""
        })
      }
    )
  })
}

function buildGeminiUrl(config: LlmConfig) {
  const defaultBase = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    config.model
  )}:generateContent`
  let url = config.endpoint || defaultBase
  if (url.includes("{API_KEY}")) {
    return url.replace("{API_KEY}", encodeURIComponent(config.apiKey))
  }
  if (!url.includes("key=")) {
    const sep = url.includes("?") ? "&" : "?"
    url = `${url}${sep}key=${encodeURIComponent(config.apiKey)}`
  }
  return url
}

function buildPrompt(
  listing: Listing,
  conversationHistory: ConversationTurn[],
  buyerMessage: string,
  strategy: string,
  systemPrompt: string
) {
  const listingTitle = listing?.title || "the item"
  const target = listing?.targetPrice
    ? `Target price: ${listing.targetPrice}`
    : "No explicit target price provided."
  const reason = listing?.priceReason
    ? `Seller reasoning: ${listing.priceReason}`
    : ""

  const history = (conversationHistory || [])
    .slice(-6)
    .map((h) => `${h.role}: ${h.text}`)
    .join("\n")

  const system =
    systemPrompt && systemPrompt.trim()
      ? systemPrompt.trim()
      : "You are a negotiation assistant for a marketplace seller. Be concise, polite, and persuasive."

  const user = `Listing: ${listingTitle}
${target}
${reason}

Conversation history:
${history || "(none)"}

Latest buyer message:
${buyerMessage}

Negotiation strategy: ${strategy}

Produce a concise, polite reply that attempts to move the buyer towards the seller's target price while preserving goodwill. If an offer is needed, propose a counteroffer and provide a brief justification. Keep the reply under 120 words.`

  return { systemPrompt: system, userPrompt: user }
}

export async function generateReply({
  listing,
  conversationHistory,
  buyerMessage,
  strategy
}: {
  listing: Listing
  conversationHistory: ConversationTurn[]
  buyerMessage: string
  strategy: string
}) {
  const config = await getConfig()
  if (!config.apiKey) {
    throw new Error("No LLM API key configured in options")
  }

  const { systemPrompt, userPrompt } = buildPrompt(
    listing,
    conversationHistory,
    buyerMessage,
    strategy,
    config.systemPrompt
  )

  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0.6, maxOutputTokens: 512 }
  }

  const response = await fetch(buildGeminiUrl(config), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })

  if (!response.ok) {
    const txt = await response.text()
    throw new Error(`LLM error ${response.status}: ${txt}`)
  }

  const result = await response.json()
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text
  return {
    raw: result,
    text: typeof text === "string" ? text.trim() : JSON.stringify(result)
  }
}
