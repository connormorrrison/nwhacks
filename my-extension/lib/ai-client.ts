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

export const generateNegotiationSuggestions = async (
    history: { text: string; sender: "me" | "them" }[],
    metadata: { itemInfo: string | null; personName: string | null }
): Promise<Suggestion[]> => {
    console.log("AI Client: generateNegotiationSuggestions called")
    console.log("AI Client: API Key present?", !!apiKey)
    console.log("AI Client: History length:", history.length)

    try {
        const prompt = `
You are an expert negotiation assistant helping a seller on Facebook Marketplace.
Context:
- Item: ${metadata.itemInfo || "Unknown item"}
- Buyer Name: ${metadata.personName || "Buyer"}

Chat History:
${history.map((h) => `${h.sender.toUpperCase()}: ${h.text}`).join("\n")}

Task: Generate the single best reply for the seller ("ME") to send next.
The reply should be polite, professional, and aim to move the negotiation forward.
If the buyer's offer is too low, counter it. If it's reasonable, accept it.

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
