
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;

const ai = new GoogleGenAI({
    apiKey: apiKey
});

async function main() {
    console.log("Listing models...");
    try {
        // The SDK structure might differ, checking documentation or common patterns
        // Usually it's ai.models.list()
        const response = await ai.models.list();
        console.log("Available models:");
        // Response might be an object with 'models' property or an array
        const models = response.models || response;

        if (Array.isArray(models)) {
            models.forEach((m: any) => {
                console.log(m.name);
            });
        } else {
            console.log(JSON.stringify(models, null, 2));
        }

    } catch (e) {
        console.error("Error listing models:", e);
    }
}

main();
