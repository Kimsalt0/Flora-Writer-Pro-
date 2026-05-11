import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface Correction {
  error: string;
  suggestion: string;
  explanation: string;
}

export async function reviewText(text: string): Promise<Correction[]> {
  if (!text.trim()) return [];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyse le texte suivant et identifie les fautes d'orthographe, de grammaire et de ponctuation. 
      Retourne uniquement les corrections spécifiques sous forme de liste d'objets JSON. 
      Pour chaque erreur, fournis le segment exact du texte original, la suggestion de correction et une brève explication en français.
      
      Texte à analyser :
      ${text}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              error: {
                type: Type.STRING,
                description: "Le segment de texte exact contenant l'erreur",
              },
              suggestion: {
                type: Type.STRING,
                description: "La version corrigée du segment",
              },
              explanation: {
                type: Type.STRING,
                description: "Brève explication de la règle ou de la faute",
              },
            },
            required: ["error", "suggestion", "explanation"],
          },
        },
      },
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error reviewing text:", error);
    return [];
  }
}
