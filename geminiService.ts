
import { GoogleGenAI, Type } from "@google/genai";
import { WizardData, AnalysisResult } from "./types";
import { LOCATION_LABELS, SYMPTOM_LABELS } from "./constants";

const AI_MODEL = 'gemini-3-flash-preview';

export const checkPhotoRelevance = async (photos: string[]): Promise<boolean> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const promptText = `Analyze if these images show water leaks? JSON: {"isRelevant":true/false}.`;
  const parts: any[] = [{ text: promptText }];
  photos.slice(0, 2).forEach((photo) => {
    const match = photo.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
  });
  try {
    const response = await ai.models.generateContent({ 
      model: AI_MODEL, 
      contents: { parts }, 
      config: { responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } } 
    });
    return JSON.parse(response.text || '{"isRelevant": true}').isRelevant;
  } catch { return true; }
};

export const analyzeLeakage = async (data: WizardData): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const locationKr = LOCATION_LABELS[data.location as string] || data.location;
  const symptomsKr = data.symptoms.map(s => SYMPTOM_LABELS[s as string] || s).join(', ');
  const leakSizeKr = data.additionalInfo.leakSize === 'SMALL' ? '미세함' : data.additionalInfo.leakSize === 'MEDIUM' ? '보통' : '심각함';

  const promptText = `
    누수 분석가로서 리포트 작성. (위치: ${locationKr}, 증상: ${symptomsKr}, 규모: ${leakSizeKr}, 연식: ${data.buildingAge}).
    영문 코드 절대 금지. 한국어만 사용. 줄바꿈 적극 활용.
    JSON (KOREAN): {
      "summary": "한국어 요약",
      "riskScore": 0-100,
      "detectionCost": "예상비",
      "repairCostInfo": "공사비",
      "overchargeThreshold": "기준",
      "causes": [{"probability": "High"|"Medium"|"Low", "title": "원인", "description": "설명"}],
      "expertGuide": "상세가이드",
      "scamCheckQuestions": ["질문...|위험...|판단..."],
      "insurance": {"probability": "High"|"Medium"|"Low", "prepList": ["서류"], "disclaimer": "안내"}
    }
  `;

  const parts: any[] = [{ text: promptText }];
  data.photos.slice(0, 3).forEach((p) => {
    const m = p.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
  });

  const response = await ai.models.generateContent({
    model: AI_MODEL,
    contents: { parts },
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          riskScore: { type: Type.NUMBER },
          detectionCost: { type: Type.STRING },
          repairCostInfo: { type: Type.STRING },
          overchargeThreshold: { type: Type.STRING },
          causes: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { probability: { type: Type.STRING }, title: { type: Type.STRING }, description: { type: Type.STRING } } } },
          expertGuide: { type: Type.STRING },
          scamCheckQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          insurance: { type: Type.OBJECT, properties: { probability: { type: Type.STRING }, prepList: { type: Type.ARRAY, items: { type: Type.STRING } }, disclaimer: { type: Type.STRING } } }
        },
        required: ["summary", "riskScore", "detectionCost", "overchargeThreshold", "causes", "expertGuide", "scamCheckQuestions", "insurance"]
      }
    }
  });

  return JSON.parse(response.text.trim()) as AnalysisResult;
};
