import { GoogleGenAI, Type } from "@google/genai";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ✅ API Key (Vercel 환경변수)
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
    });

    // ✅ body 검증
    if (!req.body || !req.body.data) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    // ✅ ★ 핵심: data 반드시 선언
    const { data } = req.body;

    const promptText = `
Analyze the following home leakage situation and provide a structured guide for the user.

User Data:
- Location: ${data.location}
- Symptoms: ${data.symptoms.join(", ")}
- Timing: ${data.timing}
- Building Type: ${data.buildingType}
- Building Age: ${data.buildingAge}
- Upper Floor Relationship: ${data.upperFloorPossibility}

Respond ONLY in JSON with this structure:
{
  "detectionCost": "string",
  "repairCostInfo": "string",
  "overchargeThreshold": "string",
  "causes": [
    { "probability": "High|Medium|Low", "title": "string", "description": "string" }
  ],
  "scamCheckQuestions": ["string"],
  "insurance": {
    "probability": "High|Medium|Low",
    "prepList": ["string"],
    "disclaimer": "string"
  }
}
All text must be in Korean.
`;

    const parts: any[] = [{ text: promptText }];

    // ✅ 사진 처리
    if (Array.isArray(data.photos)) {
      data.photos.forEach((photo: string) => {
        const match = photo.match(/^data:(image\/[a-z]+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2],
            },
          });
        }
      });
    }

    // ✅ Gemini 호출
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

    // ✅ 응답 검증
    if (!response.text) {
      throw new Error("Empty response from Gemini");
    }

    return res.status(200).json(JSON.parse(response.text));
  } catch (e) {
    console.error("Gemini API Error:", e);
    return res.status(500).json({ error: "AI 분석 실패" });
  }
}
