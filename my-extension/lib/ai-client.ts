import { GoogleGenAI } from "@google/genai"

console.log("Loading Gemini Client...")

if (!process.env.GEMINI_API_KEY) {
    console.warn("WARN: GEMINI_API_KEY is not set in environment variables.")
}

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || ""
})

export const generateReply = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview", // Using the 3.0 preview as verified
            contents: prompt
        })

        // Note: In @google/genai SDK, text is a property getter, not a function
        return response.text || ""
    } catch (error) {
        console.error("Error generating reply from Gemini:", error)
        throw error
    }
}

export interface Suggestion {
    label: "Accept" | "Counter" | "Decline" | "Polite"
    text: string
}

export const generateNegotiationSuggestions = async (
    history: { text: string; sender: "me" | "them" }[],
    metadata: { itemInfo: string | null; personName: string | null }
): Promise<Suggestion[]> => {
    try {
        const prompt = `
You are an expert negotiation assistant helping a seller on Facebook Marketplace.
Context:
- Item: ${metadata.itemInfo || "Unknown item"}
- Buyer Name: ${metadata.personName || "Buyer"}

Chat History:
${history.map((h) => `${h.sender.toUpperCase()}: ${h.text}`).join("\n")}

Task: Generate 3 distinct reply options for the seller ("ME") to send next.
1. Accept: Agree to the deal or answer positively.
2. Counter: Propose a different price or condition.
3. Decline: Politely refuse.

Output ONLY a JSON array with this structure:
[
  { "label": "Accept", "text": "..." },
  { "label": "Counter", "text": "..." },
  { "label": "Decline", "text": "..." }
]
Do not include markdown formatting like \`\`\`json. Just the raw JSON.
`

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        })

        const text = response.text || "[]"
        // Clean up if model adds markdown despite instructions
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim()

        return JSON.parse(cleanText) as Suggestion[]
    } catch (error) {
        console.error("Error generating suggestions:", error)
        return []
    }
}
