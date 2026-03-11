import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { EVALUATION_SCHEMA, Evaluation } from "../types";

export const getAIFeedback = async (evaluation: Evaluation) => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `Valuta lo studente del ${evaluation.year}.
  Dati valutazione:
  ${JSON.stringify(evaluation, null, 2)}
  
  Fornisci un'analisi dettagliata basata sui criteri specificati nelle istruzioni di sistema.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: EVALUATION_SCHEMA,
      },
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
};
