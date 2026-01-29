import { GoogleGenAI } from "@google/genai";
import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(
  req: IncomingMessage & { body?: any },
  res: ServerResponse & {
    status: (code: number) => any;
    json: (data: any) => any;
  }
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!req.body || !req.body.data) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const { data } = req.body;

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!,
    });

    const promptText = `
누수 상황을 분석하고 과다 견적을 피할 수 있도록 안내하세요.

위치: ${data.location}
증상: ${data.symptoms.join(", ")}
시점: ${data.timing}
건물 유형: ${data.buildingType}
건물 연식: ${data.buildingAge}
윗집 가능성: ${data.upperFloorPossibility}

JSON 형식으로만 응답하세요.
`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ text: promptText }],
    });

    const text =
      response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Empty Gemini response");
    }

    return res.status(200).json(JSON.parse(text));
  } catch (err) {
    console.error("Analyze API error:", err);
    return res.status(500).json({ error: "AI 분석 실패" });
  }
}
