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
        try {
            chrome.runtime.sendMessage({
                type: "FULL_MESSAGE_HISTORY", // Changed type to indicate full history
                messages: messages
            }).catch(() => {
                // Side panel might be closed, ignore error
            })
        } catch (e) {
            // Extension context invalidated (script is orphaned)
            console.log("AI Negotiator: Connection lost (please refresh page)")
        }
    }
}

// Function to insert text into the chat input
const insertText = (text: string) => {
    // Try to find the input box
    // Strategy 1: Look for the specific P tag user identified
    let inputBox = document.querySelector('p.xat24cr.xdj266r') as HTMLElement

    // Strategy 2: Look for the standard role="textbox" which is more robust
    if (!inputBox) {
        inputBox = document.querySelector('[role="textbox"]') as HTMLElement
    }

    if (inputBox) {
        console.log("AI Negotiator: Found input box:", inputBox)

        // Focus the box
        inputBox.focus()

        // If it's a contenteditable div/p, we might need to clear the <br> first
        if (inputBox.innerHTML === "<br>") {
            inputBox.innerHTML = ""
        }

        // Insert text
        // For contenteditable, document.execCommand is often the most reliable way to trigger React events
        const success = document.execCommand("insertText", false, text)

        if (!success) {
            // Fallback: Direct manipulation + events
            inputBox.textContent = text
            inputBox.dispatchEvent(new InputEvent('input', { bubbles: true }))
        }

        console.log("AI Negotiator: Inserted text, now simulating Enter")

        // Simulate Enter key to send
        setTimeout(() => {
            const enterEvent = new KeyboardEvent("keydown", {
                bubbles: true,
                cancelable: true,
                key: "Enter",
                code: "Enter",
                keyCode: 13,
                which: 13,
                view: window
            })
            inputBox.dispatchEvent(enterEvent)
        }, 100) // Small delay to ensure React state updates
    } else {
        console.error("AI Negotiator: Could not find chat input box")
    }
}

// Listen for messages from the side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "INSERT_TEXT") {
        insertText(request.text)
    }
})

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
