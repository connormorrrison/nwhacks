import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["*://*.facebook.com/*"],
  all_frames: true
}

console.log("AI Negotiator: Content script loaded on Facebook")

let lastHandledAt = 0

function getStorage<T>(key: string, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (res) => {
      resolve((res?.[key] as T) ?? fallback)
    })
  })
}

function sendMessage<T>(payload: unknown): Promise<T> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(payload, (res) => resolve(res as T))
  })
}

function showToast(msg: string) {
  const t = document.createElement("div")
  t.textContent = msg
  t.style.position = "fixed"
  t.style.left = "50%"
  t.style.transform = "translateX(-50%)"
  t.style.bottom = "24px"
  t.style.background = "#111"
  t.style.color = "#fff"
  t.style.padding = "8px 12px"
  t.style.borderRadius = "6px"
  t.style.zIndex = "2147483647"
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 2000)
}

function findMessageText(target: HTMLElement) {
  if (target.closest('textarea, input, [contenteditable="true"]')) return ""
  const candidate = target.closest(
    '[role="row"], [role="article"], div[dir="auto"]'
  ) as HTMLElement | null
  const text = (candidate?.innerText || target.innerText || "").trim()
  if (!text || text.length < 2) return ""
  if (text.length > 800) return ""
  return text
}

function setComposerText(text: string) {
  const editable =
    (document.querySelector(
      '[contenteditable="true"][role="textbox"]'
    ) as HTMLElement | null) ||
    (document.querySelector('[contenteditable="true"]') as HTMLElement | null)

  const input =
    (document.querySelector("textarea") as HTMLTextAreaElement | null) ||
    (document.querySelector("input[type='text']") as HTMLInputElement | null)

  if (editable) {
    editable.focus()
    document.execCommand("insertText", false, text)
    return true
  }
  if (input) {
    input.focus()
    input.value = text
    input.dispatchEvent(new Event("input", { bubbles: true }))
    return true
  }
  return false
}

window.addEventListener("load", () => {
  document.addEventListener("click", async (event) => {
    const now = Date.now()
    if (now - lastHandledAt < 1000) return

    const target = event.target as HTMLElement
    const message = findMessageText(target)
    if (!message) return

    const autoNegotiate = await getStorage("neg_auto", false)
    if (!autoNegotiate) return

    lastHandledAt = now
    const response = await sendMessage<{
      ok: boolean
      text?: string
      error?: string
    }>({
      type: "generate-reply",
      buyerMessage: message
    })

    if (!response?.ok || !response.text) {
      showToast(response?.error || "LLM failed")
      return
    }

    const injected = setComposerText(response.text)
    if (!injected) {
      showToast("Reply ready (couldn't find chat input)")
      return
    }
    showToast("Reply drafted")
  })
})
