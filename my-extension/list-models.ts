
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function main() {
    try {
        console.log("Listing models...");
        // The SDK structure might be different, let's try the standard way if possible
        // Note: The new @google/genai SDK might not have listModels exposed on the root or models the same way.
        // Let's try to infer from the error or just try a few known valid ones.

        // Actually, for the new SDK, let's just try to print the error from the first attempt explicitly
        // and try a very standard model like 'gemini-pro' just in case.

        const response = await ai.models.list();

        for await (const model of response) {
            console.log(model.name);
        }

    } catch (e) {
        console.error("Error listing models:", e);
    }
}

main();
