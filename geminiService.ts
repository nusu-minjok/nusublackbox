import { GoogleGenAI, Type } from "@google/genai";
import { WizardData, AnalysisResult } from "./types";

/**
 * 누수 상황 데이터를 분석하여 AI 리포트를 생성합니다.
 * - 자세함 유지
 * - 응답 속도 최적화
 */
export const analyzeLeakage = async (
  data: WizardData
): Promise<AnalysisResult> => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    throw new Error("VITE_API_KEY 누락");
  }

  const ai = new GoogleGenAI({ apiKey });

  // ✅ 프롬프트: 맥락만 제공 (자세함은 schema가 담당)
  const promptText = `
Analyze the leakage case below.
Return ONLY valid JSON in KOREAN using the provided schema.

User data:
- Location: ${data.location}
- Symptoms: ${data.symptoms.join(", ")}
- Timing: ${data.timing}
- Building: ${data.buildingType}, ${data.buildingAge}
- Upper floor related: ${data.upperFloorPossibility}
- Context:
  aircon=${data.additionalInfo.airconUsed},
  renovation=${data.additionalInfo.recentRenovation},
  hotWater=${data.additionalInfo.hotWaterWorsens},
  rain=${data.additionalInfo.rainWorsens},
  scale=${data.additionalInfo.leakSize}
  `.trim();

  const parts: any[] = [{ text: promptText }];

  // ✅ 사진이 있을 때만 멀티모달 추가 (속도 보호)
  if (data.photos?.length) {
    for (const photo of data.photos) {
      const match = photo.match(/^data:(image\/[a-z]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
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
                  description: { type: Type.STRING },
                },
                required: ["probability", "title", "description"],
              },
            },
            scamCheckQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            insurance: {
              type: Type.OBJECT,
              properties: {
                probability: { type: Type.STRING },
                prepList: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                disclaimer: { type: Type.STRING },
              },
              required: ["probability", "prepList", "disclaimer"],
            },
          },
          required: [
            "detectionCost",
            "repairCostInfo",
            "overchargeThreshold",
            "causes",
            "scamCheckQuestions",
            "insurance",
          ],
        },
      },
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error("AI response was empty");
    }

    return JSON.parse(textResult.trim()) as AnalysisResult;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
