
import { GoogleGenAI, Type } from "@google/genai";
import { WizardData, AnalysisResult } from "../types";

// Note: API key is provided via process.env.API_KEY injected at build time.

/**
 * Fix: Removed local process declaration to rely on global environment as per guidelines.
 * Fix: Updated GoogleGenAI initialization and generateContent call to follow current SDK best practices.
 */
export const analyzeLeakage = async (data: WizardData): Promise<AnalysisResult> => {
  // Initialize GoogleGenAI with a named parameter for the API key.
  const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY
});
  
  const promptText = `
    Analyze the following home leakage situation and provide a structured guide for the user.
    The goal is to provide realistic expectations, possible causes, and avoid being overcharged.

    User Data:
    - Location: ${data.location}
    - Symptoms: ${data.symptoms.join(', ')}
    - Timing: ${data.timing}
    - Building Type: ${data.buildingType}
    - Building Age: ${data.buildingAge}
    - Upper Floor Relationship: ${data.upperFloorPossibility}
    - Additional context: 
        AC used: ${data.additionalInfo.airconUsed}, 
        Recent Reno: ${data.additionalInfo.recentRenovation}, 
        Hot water worsens: ${data.additionalInfo.hotWaterWorsens}, 
        Rain worsens: ${data.additionalInfo.rainWorsens}, 
        Scale: ${data.additionalInfo.leakSize}

    Respond in JSON format only with the structure:
    {
      "detectionCost": "string range (e.g. 20~40만 원)",
      "repairCostInfo": "string summary (e.g. 원인 확정 후 10~80만 원 이상 추가 가능)",
      "overchargeThreshold": "string (e.g. 탐지 비용 60만 원 이상 제시 시 과다 견적 의심)",
      "causes": [
        {"probability": "High"|"Medium"|"Low", "title": "Cause Name", "description": "2-3 lines reasoning"}
      ],
      "scamCheckQuestions": ["string", "string", ...],
      "insurance": {
        "probability": "High"|"Medium"|"Low",
        "prepList": ["string", "string", ...],
        "disclaimer": "보험 보장 여부는 보험사에 직접 확인해야 합니다."
      }
    }
    All text must be in Korean.
  `;

  // Prepare parts for multi-modal generation.
  const parts: any[] = [{ text: promptText }];

  // Add photos if they exist (stripping the data URL prefix).
  data.photos.forEach(photo => {
    const match = photo.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    if (match) {
      parts.push({
        inlineData: {
          mimeType: match[1],
          data: match[2]
        }
      });
    }
  });

  // Call generateContent with model name and prompt parts.
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          detectionCost: { type: Type.STRING },
          repairCostInfo: { type: Type.STRING },
          overchargeThreshold: { type: Type.STRING },
          causes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                probability: { type: Type.STRING },
                title: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["probability", "title", "description"]
            }
          },
          scamCheckQuestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          insurance: {
            type: Type.OBJECT,
            properties: {
              probability: { type: Type.STRING },
              prepList: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              disclaimer: { type: Type.STRING }
            },
            required: ["probability", "prepList", "disclaimer"]
          }
        },
        required: ["detectionCost", "repairCostInfo", "overchargeThreshold", "causes", "scamCheckQuestions", "insurance"]
      }
    }
  });

  // Access the text property directly (not a method).
  const text = response.text;
  if (!text) {
    throw new Error("Empty response from AI");
  }

  return JSON.parse(text.trim()) as AnalysisResult;
};
