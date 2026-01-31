
import { GoogleGenAI, Type } from "@google/genai";
import { WizardData, AnalysisResult } from "./types";
import { LOCATION_LABELS, SYMPTOM_LABELS } from "./constants";

const AI_MODEL = 'gemini-3-flash-preview';

/**
 * 속도 최적화를 위해 매우 간결한 프롬프트 사용
 */
export const checkPhotoRelevance = async (photos: string[]): Promise<boolean> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const promptText = `Are these photos of home water leaks or plumbing? Return JSON: {"isRelevant":true/false}. Be fast.`;
  const parts: any[] = [{ text: promptText }];
  
  // 첫 번째 사진만으로도 충분히 판단 가능하므로 속도를 위해 최대 2장만 전송
  photos.slice(0, 2).forEach((photo) => {
    const match = photo.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
  });

  try {
    const response = await ai.models.generateContent({ 
      model: AI_MODEL, 
      contents: { parts }, 
      config: { 
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 } // Flash 모델의 불필요한 연산 억제
      } 
    });
    return JSON.parse(response.text || '{"isRelevant": true}').isRelevant;
  } catch { return true; }
};

export const analyzeLeakage = async (data: WizardData): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const locationKr = LOCATION_LABELS[data.location as string] || data.location;
  const symptomsKr = data.symptoms.map(s => SYMPTOM_LABELS[s as string] || s).join(', ');
  const leakSizeKr = data.additionalInfo.leakSize === 'SMALL' ? '미세함(번짐)' : data.additionalInfo.leakSize === 'MEDIUM' ? '보통(낙수)' : '심각함(쏟아짐)';

  const promptText = `
    전문 누수 분석가로서 다음 상황을 분석하세요.
    - 위치: ${locationKr}
    - 증상: ${symptomsKr}
    - 규모: ${leakSizeKr}
    - 건물연식: ${data.buildingAge}
    - 위층여부: ${data.upperFloorPossibility}
    - 사용자의 추가 상세 설명: ${data.extraNote || '없음'}

    [제약 사항]
    - 'RAIN_ONLY', 'DRIPPING' 등 영문 코드 사용 엄금. 100% 한국어로만 작성.
    - 요약과 가이드는 문단별 줄바꿈(\n\n) 필수. 가독성 최우선.
    - 탐지비: 30-80만 원 사이에서 난이도에 따라 현실적으로 책정.
    - scamCheckQuestions 형식: "질문: ... | 위험답변: ... | 판단근거: ..."

    [응답 포맷] JSON (KOREAN)
    {
      "summary": "핵심 요약 (한국어)",
      "riskScore": 0~100,
      "detectionCost": "예상 탐지비",
      "repairCostInfo": "공사비 정보",
      "overchargeThreshold": "과다견적 기준",
      "causes": [{"probability": "High"|"Medium"|"Low", "title": "원인", "description": "설명"}],
      "expertGuide": "상세 가이드",
      "scamCheckQuestions": ["질문...|위험...|판단..."],
      "insurance": {"probability": "High"|"Medium"|"Low", "prepList": ["서류"], "disclaimer": "안내"}
    }
  `;

  const parts: any[] = [{ text: promptText }];
  // 분석용 사진은 상위 3장만 사용하여 전송 시간 단축
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
