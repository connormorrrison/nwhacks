
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function main() {
    console.log("Sending request to Gemini (model: gemini-3-flash-preview)...");
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: "Explain how AI works in a few words",
        });
        console.log("Success! Response:");
        console.log(response.text);
    } catch (e) {
        console.error("Error with gemini-3-flash-preview:", e);

        // Attempt with explicit 'models/' prefix just in case
        console.log("Retrying with 'models/' prefix...");
        try {
            const response = await ai.models.generateContent({
                model: "models/gemini-3-flash-preview",
                contents: "Explain how AI works in a few words",
            });
            console.log("Success with prefix! Response:");
            console.log(response.text());
        } catch (e2) {
            console.error("Error with prefix:", e2);
        }
    }
}

main();
