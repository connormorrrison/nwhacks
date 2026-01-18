/// <reference types="chrome" />
import { generateReply, Listing } from "../../lib/llm"

export {}

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error))

type ConversationTurn = { role: "buyer" | "seller"; text: string }

function getStorage<T>(key: string, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (res) => {
      resolve((res?.[key] as T) ?? fallback)
    })
  })
}

function setStorage(key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve())
  })
}

async function getHistory(listingId: string) {
  const all = await getStorage<Record<string, ConversationTurn[]>>(
    "neg_history",
    {}
  )
  return all[listingId] || []
}

async function setHistory(listingId: string, history: ConversationTurn[]) {
  const all = await getStorage<Record<string, ConversationTurn[]>>(
    "neg_history",
    {}
  )
  all[listingId] = history
  await setStorage("neg_history", all)
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "generate-reply") return

  ;(async () => {
    try {
      const listing = (await getStorage("active_listing", null)) as Listing | null
      if (!listing?.id) {
        throw new Error("No active listing configured in side panel")
      }

      const strategy = listing.strategy || "friendly"
      const history = await getHistory(listing.id)
      const buyerMessage = String(message.buyerMessage || "").trim()
      if (!buyerMessage) throw new Error("Missing buyer message")

      const updated = history.concat([{ role: "buyer", text: buyerMessage }])
      const result = await generateReply({
        listing,
        conversationHistory: updated,
        buyerMessage,
        strategy
      })

      const nextHistory = updated.concat([
        { role: "seller", text: result.text }
      ])
      await setHistory(listing.id, nextHistory)

      sendResponse({ ok: true, text: result.text })
    } catch (err) {
      sendResponse({ ok: false, error: (err as Error).message })
    }
  })()

  return true
})
