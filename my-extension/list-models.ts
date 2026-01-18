import { GoogleGenAI } from "@google/genai"
import dotenv from "dotenv"

dotenv.config()

const apiKey = process.env.GEMINI_API_KEY
const ai = new GoogleGenAI({ apiKey })

async function listModels() {
    try {
        console.log("Listing models...")
        const response = await ai.models.list()
        console.log("Models:", response)
    } catch (error) {
        console.error("List Failed:", error)
    }
}

listModels()
