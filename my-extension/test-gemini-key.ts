import { GoogleGenAI } from "@google/genai"
import dotenv from "dotenv"

dotenv.config()

const apiKey = process.env.GEMINI_API_KEY

console.log("Testing Gemini API Key:", apiKey ? "Present" : "Missing")

if (!apiKey) {
    console.error("Error: GEMINI_API_KEY is missing in .env")
    process.exit(1)
}

const ai = new GoogleGenAI({ apiKey })

async function test() {
    try {
        console.log("Sending test request...")
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Hello, are you working?"
        })
        console.log("Response received!")
        console.log("Text:", (response as any).text ? (response as any).text() : "No text")
    } catch (error) {
        console.error("Test Failed:", error)
    }
}

test()
