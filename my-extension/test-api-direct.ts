
import fs from "fs";
import path from "path";

// Manually read .env
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

async function checkEndpoint(version: string) {
    const url = `https://generativelanguage.googleapis.com/${version}/models?key=${apiKey}`;
    console.log(`\nChecking ${version} endpoint...`);
    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.error) {
            console.error(`Error from ${version}:`, data.error.message);
            return;
        }

        if (data.models) {
            console.log(`Found ${data.models.length} models in ${version}.`);
            const names = data.models.map((m: any) => m.name.replace("models/", ""));
            console.log("Models:", names.join(", "));

            if (names.includes("gemini-1.5-flash")) {
                console.log(`✅ gemini-1.5-flash IS available in ${version}!`);
            }
        } else {
            console.log(`No models found in ${version}.`);
        }
    } catch (e: any) {
        console.error(`Failed to fetch ${version}:`, e.message);
    }
}

async function main() {
    await checkEndpoint("v1beta");
    await checkEndpoint("v1");
}

main();
