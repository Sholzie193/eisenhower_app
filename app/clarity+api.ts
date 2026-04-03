import { CLARITY_V1_PROMPT } from "../src/features/clarity-v1/prompt";
import { CLARITY_V1_JSON_SCHEMA } from "../src/features/clarity-v1/schema";
import { readOpenAiApiKey } from "../src/server/read-openai-api-key";

const OPENAI_MODEL = process.env.OPENAI_CLARITY_MODEL?.trim() || "gpt-4.1-mini";
const isGpt5FamilyModel = /^gpt-5(?:[.-]|$)/i.test(OPENAI_MODEL);

const getMessageContent = (rawContent: unknown) => {
  if (typeof rawContent === "string") {
    return rawContent;
  }

  if (!Array.isArray(rawContent)) {
    return "";
  }

  return rawContent
    .map((part) =>
      typeof part === "string"
        ? part
        : typeof (part as { text?: unknown })?.text === "string"
          ? ((part as { text: string }).text ?? "")
          : ""
    )
    .join("");
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const rawInput = typeof body?.rawInput === "string" ? body.rawInput.trim() : "";

  if (!rawInput) {
    return Response.json({ error: "Missing rawInput" }, { status: 400 });
  }

  const apiKey = readOpenAiApiKey();
  if (!apiKey) {
    return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 });
  }

  try {
    const requestBody = {
      model: OPENAI_MODEL,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "clarity_v1",
          strict: true,
          schema: CLARITY_V1_JSON_SCHEMA,
        },
      },
      messages: [
        { role: "system", content: CLARITY_V1_PROMPT },
        { role: "user", content: rawInput },
      ],
      ...(isGpt5FamilyModel
        ? { max_completion_tokens: 500 }
        : { temperature: 0.1, max_tokens: 500 }),
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      return Response.json(
        {
          error: "OpenAI request failed",
          status: response.status,
          body: errorBody.slice(0, 500),
        },
        { status: response.status }
      );
    }

    const payload = await response.json().catch(() => null);
    const content = getMessageContent(payload?.choices?.[0]?.message?.content);
    if (!content.trim()) {
      return Response.json({ error: "Missing OpenAI message content" }, { status: 502 });
    }

    const parsed = JSON.parse(content) as unknown;
    return Response.json(parsed);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Clarity request failed" },
      { status: 500 }
    );
  }
}
