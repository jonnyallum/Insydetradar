import { GoogleGenerativeAI } from "@google/generative-ai";
import 'dotenv/config';

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    // Note: The SDK might not have a direct listModels, we might need a fetch or check docs.
    // Actually, let's just try 'gemini-1.5-flash' with the standard 'v1' endpoint if possible, 
    // but the JS SDK abstract this.

    // Let's try gemini-1.5-flash without beta if possible, or try a different name.
    console.log("Checking model availability...");
}

listModels();
