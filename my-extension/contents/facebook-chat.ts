import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
    matches: ["*://*.facebook.com/*"],
    all_frames: true
}

console.log("AI Negotiator: Content script loaded on Facebook")

// Placeholder for message extraction logic
window.addEventListener("load", () => {
    console.log("AI Negotiator: Window loaded")

    // Helper to identify selectors: Log clicked element details
    document.addEventListener("click", (event) => {
        const target = event.target as HTMLElement
        console.log("AI Negotiator: Clicked Element:", target)
        console.log("AI Negotiator: Clicked OuterHTML:", target.outerHTML)
        if (target.parentElement) {
            console.log("AI Negotiator: Parent OuterHTML:", target.parentElement.outerHTML)
        }

        // Try to find the closest common message container candidates
        const messageCandidate = target.closest('[role="row"], [role="article"], div[class*="message"], div[class*="text"]')
        if (messageCandidate) {
            console.log("AI Negotiator: Potential Message Container:", messageCandidate)
            console.log("AI Negotiator: Potential Message HTML:", messageCandidate.outerHTML)
        }
    })
})
