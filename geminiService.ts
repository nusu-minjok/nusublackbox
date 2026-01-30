
import { GoogleGenAI, Type } from "@google/genai";
import { WizardData, AnalysisResult } from "./types";

/**
 * 누수 상황 데이터를 분석하여 AI 리포트를 생성합니다.
 */
export const analyzeLeakage = async (data: WizardData): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const promptText = `
    Analyze the following home leakage situation and provide a structured guide for the user in KOREAN.
    The goal is to provide realistic expectations, possible causes, and avoid being overcharged.

    User Input Data:
    - Location: ${data.location}
    - Symptoms: ${data.symptoms.join(', ')}
    - Timing: ${data.timing}
    - Building Type: ${data.buildingType}
    - Building Age: ${data.buildingAge}
    - Relation to floor above: ${data.upperFloorPossibility}
    - Detailed context: 
        Aircon: ${data.additionalInfo.airconUsed}, 
        Renovation: ${data.additionalInfo.recentRenovation}, 
        Hot water: ${data.additionalInfo.hotWaterWorsens}, 
        Rain: ${data.additionalInfo.rainWorsens}

    Respond strictly in JSON format only (no markdown code blocks) with this structure:
    {
      "detectionCost": "탐지 예상 비용 범위만 작성하세요. 괄호를 포함한 부연 설명이나 특이사항은 절대 넣지 마세요. (예: 30~50만 원)",
      "repairCostInfo": "공사 비용 관련 요약 설명",
      "overchargeThreshold": "과다 견적 주의 안내 (예: 단순 탐지 명목으로 60만 원 이상 요구 시 주의)",
      "causes": [
        {"probability": "High"|"Medium"|"Low", "title": "원인 명칭", "description": "원인에 대한 분석 내용. 문장 끝에 반드시 마침표를 찍으세요."}
      ],
      "scamCheckQuestions": ["질문 1", "질문 2", ...],
      "insurance": {
        "probability": "High"|"Medium"|"Low",
        "prepList": ["서류 1", "서류 2", ...],
        "disclaimer": "보험 가이드 문구"
      }
    }
    IMPORTANT: Provide the response in KOREAN language only.
  `;

  const parts: any[] = [{ text: promptText }];

  if (data.photos && data.photos.length > 0) {
    data.photos.forEach((photo) => {
      const match = photo.match(/^data:(image\/[a-z]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: { mimeType: match[1], data: match[2] }
        });
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
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
            scamCheckQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            insurance: {
              type: Type.OBJECT,
              properties: {
                probability: { type: Type.STRING },
                prepList: { type: Type.ARRAY, items: { type: Type.STRING } },
                disclaimer: { type: Type.STRING }
              },
              required: ["probability", "prepList", "disclaimer"]
            }
          },
          required: ["detectionCost", "repairCostInfo", "overchargeThreshold", "causes", "scamCheckQuestions", "insurance"]
        }
      }
    });

    const textResult = response.text;
    if (!textResult) throw new Error("AI response was empty.");
    return JSON.parse(textResult.trim()) as AnalysisResult;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
