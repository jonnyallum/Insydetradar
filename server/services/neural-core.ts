import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const neuralCore = {
    /**
     * Refine a trading signal using Gemini A.I.
     */
    async refineSignal(symbol: string, indicators: any) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

            const prompt = `
        ACT AS AN ELITE QUANTITATIVE ANALYST.
        SYMBOL: ${symbol}
        TECHNICAL DATA: ${JSON.stringify(indicators)}
        
        Provide a tactical score (0-100) and a 1-sentence neural conviction for this signal.
        Format: JSON { score: number, conviction: string }
      `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return JSON.parse(text.match(/\{.*\}/)?.[0] || '{"score": 50, "conviction": "Neural link stable, awaiting deeper data."}');
        } catch (error: any) {
            console.error("[NeuralCore] Gemini refinement failed:", error.message || error);
            if (error.response) console.error("[NeuralCore] Error Response:", error.response.data);
            return { score: 50, conviction: "Tactical data fallback: Neural core offline." };
        }
    }
};
