
import { GoogleGenAI, Type } from "@google/genai";
import { WizardData, AnalysisResult } from "./types";

/**
 * 누수 상황 데이터를 분석하여 AI 리포트를 생성합니다.
 */
export const analyzeLeakage = async (data: WizardData): Promise<AnalysisResult> => {
  // Fix: The API key availability is a hard requirement. 
  // Fix: Always use named parameter for apiKey and use process.env.API_KEY directly.
  // Fix: Use 'gemini-1.5-flash' for complex diagnosis tasks involving reasoning and multimodal data.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const promptText = `
    Analyze the following home leakage situation and provide a structured guide for the user in KOREAN.
    The goal is to provide realistic expectations, possible causes, and avoid being overcharged.

    User Input Data:
    - Location of leak: ${data.location}
    - Reported Symptoms: ${data.symptoms.join(', ')}
    - When it happens: ${data.timing}
    - Building Type: ${data.buildingType}
    - Building Age: ${data.buildingAge}
    - Relation to floor above: ${data.upperFloorPossibility}
    - Detailed context: 
        Aircon running: ${data.additionalInfo.airconUsed}, 
        Recently renovated: ${data.additionalInfo.recentRenovation}, 
        Worsens with hot water: ${data.additionalInfo.hotWaterWorsens}, 
        Worsens when raining: ${data.additionalInfo.rainWorsens}, 
        Leakage scale: ${data.additionalInfo.leakSize}

    Respond strictly in JSON format only (no markdown code blocks) with this structure:
    {
      "detectionCost": "탐지 예상 비용 범위만 작성하세요. 괄호를 포함한 부연 설명이나 특이사항은 절대 넣지 마세요. (예: 25~45만 원)",
      "repairCostInfo": "공사 비용 관련 요약 설명 (예: 원인에 따라 15~100만 원 이상 유동적)",
      "overchargeThreshold": "과다 견적 주의 안내 (예: 탐지 비용 60만 원 이상 요구 시 주의)",
      "causes": [
        {"probability": "High"|"Medium"|"Low", "title": "원인 명칭", "description": "원인에 대한 2~3줄의 논리적 분석 내용"}
      ],
      "scamCheckQuestions": ["업체 방문 시 물어봐야 할 질문 1", "질문 2", ...],
      "insurance": {
        "probability": "High"|"Medium"|"Low",
        "prepList": ["준비 서류 1", "서류 2", ...],
        "disclaimer": "보험 약관에 따라 보상 여부는 달라질 수 있습니다."
      }
    }
    IMPORTANT: Provide the response in KOREAN language only.
  `;

  const parts: any[] = [{ text: promptText }];

  // 사진 데이터가 있을 경우 멀티모달 처리
  if (data.photos && data.photos.length > 0) {
    data.photos.forEach((photo) => {
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
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
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

    // Fix: Access the .text property directly (do not call it as a method).
    const textResult = response.text;
    if (!textResult) {
      throw new Error("AI response was empty.");
    }

    return JSON.parse(textResult.trim()) as AnalysisResult;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
