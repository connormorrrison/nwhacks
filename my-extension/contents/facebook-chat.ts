import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
    matches: ["*://*.facebook.com/*"],
    all_frames: true
}

console.log("AI Negotiator: Content script loaded on Facebook")

// Function to extract text from a message row or bubble
const extractMessageText = (element: Element): { text: string, sender: "me" | "them" } | null => {
    // Strategy 1: Look for child div with dir="auto" (Marketplace rows)
    let textDiv = element.querySelector('div[dir="auto"]')

    // Strategy 2: The element itself is the text div (Regular chat fallback)
    if (!textDiv && element.getAttribute("dir") === "auto") {
        textDiv = element
    }

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

    // console.log(`AI Negotiator: Extracted: "${text.substring(0, 20)}...", Class: ${className}, Sender: ${sender}`)

    return { text, sender }
}

// State to track sent messages
let lastMessageSignature = ""
let observer: MutationObserver | null = null

// Helper to safely send messages
const safelySendMessage = (message: any) => {
    if (chrome.runtime?.id) {
        chrome.runtime.sendMessage(message).catch((error) => {
            if (error.message.includes("Extension context invalidated")) {
                console.log("AI Negotiator: Context invalidated, stopping observer.")
                // Stop the observer if context is invalid
                if (observer) observer.disconnect()
            }
        })
    }
}

// Function to process messages (Robust Sync)
const processMessages = () => {
    // Unified Selector: Target message bubbles directly
    // This works for both Marketplace (which contains these bubbles) and Regular chats
    const elements = document.querySelectorAll('div[dir="auto"].xyk4ms5, div[dir="auto"].x18lvrbx')

    const allMessages: { text: string, sender: "me" | "them" }[] = []

    elements.forEach((el) => {
        const msg = extractMessageText(el)
        if (msg) {
            allMessages.push(msg)
        }
    })

    if (allMessages.length === 0) return

    // Create a signature to detect ANY change (new message, deletion, chat switch)
    const lastMsg = allMessages[allMessages.length - 1]
    const currentSignature = `${allMessages.length}-${lastMsg.text}-${lastMsg.sender}`

    if (currentSignature !== lastMessageSignature) {
        console.log(`AI Negotiator: Syncing ${allMessages.length} messages (Sig: ${currentSignature})`)
        safelySendMessage({
            type: "FULL_MESSAGE_HISTORY",
            messages: allMessages
        })
        lastMessageSignature = currentSignature
    }
}

// ... (rest of file)

window.addEventListener("load", () => {
    // 1. Process initial messages
    setTimeout(() => {
        processMessages()
        extractChatMetadata()
    }, 2000)

    // 2. Set up MutationObserver to watch for changes
    // Faster debounce (100ms) for snappier updates
    let timeout: NodeJS.Timeout
    observer = new MutationObserver(() => {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
            processMessages()
            extractChatMetadata()
        }, 100)
    })
    observer.observe(document.body, {
        childList: true,
        subtree: true
    })

    // 3. Periodic Refresh (Fallback for missed mutations)
    setInterval(() => {
        processMessages()
    }, 3000)
})

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
    } else if (request.type === "GET_CHAT_HISTORY") {
        console.log("AI Negotiator: Received request for chat history")
        processMessages()
        extractChatMetadata()
    } else if (request.type === "LOG") {
        console.log(`[SIDE_PANEL]: ${request.message}`)
    }
})

// Function to extract chat metadata (Item info and Person name)
const extractChatMetadata = () => {
    console.log("AI Negotiator: --- Metadata Extraction Start ---")

    // 1. Try to find Person Name (H5 is usually reliable for the header)
    // Scope to main chat if possible, or filter out common non-name headers
    const h5s = document.querySelectorAll('h5')
    let personName: string | null = null

    for (const h5 of h5s) {
        const text = h5.textContent
        // Relaxed filter: just avoid "You sent" and "Marketplace"
        if (text && text !== "You sent" && text !== "Marketplace") {
            personName = text
            break
        }
    }

    // 2. Try to find Item Info
    let itemInfo: string | null = null

    // Strategy A: Find all divs with the class user provided and filter
    const candidateDivs = document.querySelectorAll('div.xu06os2.x1ok221b')
    console.log(`AI Negotiator: Found ${candidateDivs.length} candidate divs`)

    candidateDivs.forEach((div, i) => {
        const text = div.textContent
        // console.log(`AI Negotiator: Candidate [${i}]:`, text) // Reduced noise
        if (text && text !== "Marketplace" && (text.includes("CA$") || text.includes("$") || text.includes("-"))) {
            itemInfo = text
        }
    })

    // Strategy B: Look for "Marketplace" text and get the next sibling
    if (!itemInfo) {
        const marketplaceSpan = Array.from(document.querySelectorAll('span')).find(s => s.textContent === "Marketplace")
        if (marketplaceSpan) {
            // Go up to the container div
            const container = marketplaceSpan.closest('div.xu06os2.x1ok221b')
            if (container && container.nextElementSibling) {
                itemInfo = container.nextElementSibling.textContent
                console.log("AI Negotiator: Found item via Marketplace sibling:", itemInfo)
            }
        }
    }

    // Strategy C: Brute force search for "CA$" or "$" (Fallback)
    if (!itemInfo) {
        const allElements = document.querySelectorAll('*')
        for (const el of allElements) {
            // Look for leaf nodes (no children) with text
            if (el.children.length === 0 && el.textContent) {
                const text = el.textContent
                if ((text.includes("CA$") || text.includes("$")) && /\d/.test(text) && text.length < 100) {
                    console.log("AI Negotiator: Found potential item via brute force:", el)
                    itemInfo = text
                    break // Stop at first match
                }
            }
        }
    }

    console.log("AI Negotiator: Final Decision -> Name:", personName, "Item:", itemInfo)

    if (itemInfo || personName) {
        safelySendMessage({
            type: "CHAT_METADATA",
            metadata: { itemInfo, personName }
        })
    }
    console.log("AI Negotiator: --- Metadata Extraction End ---")
}

window.addEventListener("load", () => {
    // 1. Process initial messages
    setTimeout(() => {
        processMessages()
        extractChatMetadata()
    }, 2000)

    // 2. Set up MutationObserver to watch for changes
    // We debounce the update to avoid sending too many messages during rapid loading
    let timeout: NodeJS.Timeout
    observer = new MutationObserver(() => {
        clearTimeout(timeout)
        timeout = setTimeout(() => {
            processMessages()
            extractChatMetadata()
        }, 500)
    })
    observer.observe(document.body, {
        childList: true,
        subtree: true
    })

    // 3. Periodic Refresh (Fallback for missed mutations)
    setInterval(() => {
        processMessages()
    }, 3000)
})
