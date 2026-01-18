import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
    matches: ["*://*.facebook.com/*"],
    all_frames: true
}

console.log("AI Negotiator: Content script loaded on Facebook")

// Function to extract text from a message row
const extractMessageText = (row: Element): { text: string, sender: "me" | "them" } | null => {
    // The user identified that text is in a div with dir="auto"
    const textDiv = row.querySelector('div[dir="auto"]')
    if (!textDiv) return null

    const text = textDiv.textContent
    if (!text) return null

    // Class based identification
    const className = textDiv.className
    let sender: "me" | "them" = "them"

    if (className.includes("xyk4ms5")) {
        sender = "me"
    } else if (className.includes("x18lvrbx")) {
        sender = "them"
    }

    console.log(`AI Negotiator: Extracted: "${text.substring(0, 20)}...", Class: ${className}, Sender: ${sender}`)

    return { text, sender }
}

// Function to process and send ALL messages (full history)
const processAllMessages = () => {
    const rows = document.querySelectorAll('div[role="row"]')
    const messages: { text: string, sender: "me" | "them" }[] = []

    rows.forEach((row) => {
        const msg = extractMessageText(row)
        if (msg) {
            messages.push(msg)
        }
    })

    if (messages.length > 0) {
        console.log(`AI Negotiator: Sending ${messages.length} messages to side panel`)
        chrome.runtime.sendMessage({
            type: "FULL_MESSAGE_HISTORY", // Changed type to indicate full history
            messages: messages
        })
    }
}

window.addEventListener("load", () => {
    // 1. Process initial messages
    setTimeout(processAllMessages, 2000)

    // 2. Set up MutationObserver to watch for changes
    // We debounce the update to avoid sending too many messages during rapid loading
    let timeout: NodeJS.Timeout
    const observer = new MutationObserver(() => {
        clearTimeout(timeout)
        timeout = setTimeout(processAllMessages, 500)
    })

    observer.observe(document.body, {
        childList: true,
        subtree: true
    })
})
