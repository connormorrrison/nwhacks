import { GoogleGenAI } from "@google/genai"

console.log("Loading Gemini Client...")

const apiKey = process.env.PLASMO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || ""

if (!apiKey) {
    console.warn("WARN: GEMINI_API_KEY is not set in environment variables.")
}

const ai = new GoogleGenAI({
    apiKey: apiKey
})

export const generateReply = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash-001",
            contents: prompt
        })

        return response.text || ""
    } catch (error) {
        console.error("Error generating reply from Gemini:", error)
        throw error
    }
}

export interface Suggestion {
    label: "Reply"
    text: string
}

export interface NegotiationSettings {
    autoNegotiate: boolean
    priceDeviation: number
    tone: "friendly" | "professional" | "firm"
    address: string
    authorizeAddress: boolean
}

export const generateNegotiationSuggestions = async (
    history: { text: string; sender: "me" | "them" }[],
    metadata: { itemInfo: string | null; personName: string | null },
    settings: NegotiationSettings
): Promise<Suggestion[]> => {
    console.log("AI Client: generateNegotiationSuggestions called")
    console.log("AI Client: API Key present?", !!apiKey)
    console.log("AI Client: History length:", history.length)
    console.log("AI Client: Settings:", settings)

    const toneInstructions = {
        friendly: "Use emojis, be casual, enthusiastic, and build rapport. Example: 'Hey! 😊 That sounds great!'",
        professional: "Be concise, polite, grammatically perfect, and business-like. Example: 'Hello. That works for me.'",
        firm: "Be direct, serious, do not use emojis, and stand your ground on price. Example: 'No. The price is fixed.'"
    }

    const addressInstruction = settings.authorizeAddress
        ? `Authorized Pickup Address: ${settings.address || "Do not reveal address yet"}`
        : "Authorized Pickup Address: DO NOT REVEAL. You are NOT authorized to share the address."

    try {
        const prompt = `
You are an expert negotiation assistant helping a seller on Facebook Marketplace.
Context:
- Item: ${metadata.itemInfo || "Unknown item"}
- Buyer Name: ${metadata.personName || "Buyer"}

Settings & Constraints:
- Tone: ${settings.tone.toUpperCase()}
- Tone Instructions: ${toneInstructions[settings.tone]}
- Maximum Price Deviation: +/- $${settings.priceDeviation}
- ${addressInstruction}

Strict Rules:
1. PRICE: You strictly CANNOT accept any offer below [Asking Price - $${settings.priceDeviation}]. You must counter-offer if the buyer goes lower.
2. ADDRESS: ${settings.authorizeAddress ? "Only reveal the address if the buyer explicitly agrees to the price or asks for pickup details AFTER a deal is struck." : "NEVER reveal the address. You are not authorized."}
3. TONE: You must strictly adhere to the '${settings.tone}' tone instructions above.

Chat History:
${history.map((h) => `${h.sender.toUpperCase()}: ${h.text}`).join("\n")}

Task: Generate the single best reply for the seller ("ME") to send next.
The reply should be ${settings.tone}, professional, and aim to move the negotiation forward.
If the buyer's offer is too low (outside deviation), counter it. If it's reasonable, accept it.
If the deal is agreed, you may share the pickup address: ${settings.address}.

Output ONLY a JSON array with this structure containing ONE element:
[
  { "label": "Reply", "text": "..." }
]
Do not include markdown formatting like \`\`\`json. Just the raw JSON.
`
        console.log("AI Client: Sending prompt to Gemini...")
        const response = await ai.models.generateContent({
            model: "gemini-flash-latest",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        })

        console.log("AI Client: Received response from Gemini")

        // Handle response parsing manually since .text() helper might be missing
        let text = ""
        if (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) {
            text = response.candidates[0].content.parts[0].text
        } else if (typeof response.text === 'function') {
            text = response.text()
        } else if (response.text) {
            text = response.text
        }

        console.log("AI Client: Raw response text:", text)

        // Clean up if model adds markdown despite instructions
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim()

        const parsed = JSON.parse(cleanText) as Suggestion[]
        console.log("AI Client: Parsed suggestions:", parsed)
        return parsed
    } catch (error) {
        console.error("AI Client: Error generating suggestions:", error)
        return []
    }
}
