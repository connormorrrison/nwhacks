import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import path from "path";

// Manually read .env since dotenv isn't installed
const envPath = path.resolve(__dirname, ".env");
let apiKey = process.env.PLASMO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

if (!apiKey && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    const match = envContent.match(/PLASMO_PUBLIC_GEMINI_API_KEY=(.*)/);
    if (match) {
        apiKey = match[1].trim();
    }
}

console.log("API Key present:", !!apiKey);

const ai = new GoogleGenAI({
    apiKey: apiKey
});

async function testModel(modelName: string) {
    console.log(`\nTesting model: ${modelName}...`);
    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: "Say 'Hello' if you can hear me.",
        });

        console.log(`✅ Request succeeded with ${modelName}!`);
        console.log("Response Keys:", Object.keys(response));
        // @ts-ignore
        if (response.candidates) {
            // @ts-ignore
            console.log("Candidates:", JSON.stringify(response.candidates, null, 2));
        } else {
            console.log("Full Response:", JSON.stringify(response, null, 2));
        }

        try {
            console.log(`Text: ${response.text()}`);
        } catch (e) {
            console.log("Could not call .text()");
        }
        return true;
    } catch (e: any) {
        console.error(`❌ Failed with ${modelName}: ${e.message}`);
        return false;
    }
}

async function main() {
    console.log("Listing available models...");
    try {
        // @ts-ignore
        const response = await ai.models.list();
        console.log("List Response Type:", typeof response);
        console.log("List Response Keys:", Object.keys(response));
        if (Array.isArray(response)) {
            console.log("Response is array of length:", response.length);
        } else {
            console.log("Response JSON:", JSON.stringify(response, null, 2));
        }
    } catch (e: any) {
        console.error("Failed to list models:", e.message);
    }

    const models = [
        "gemini-flash-latest"
    ];

    for (const model of models) {
        await testModel(model);
    }
}

main();
