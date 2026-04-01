import Constants from "expo-constants";
import { CLARITY_V1_PROMPT } from "./prompt";
import { normalizeClarityV1Result } from "./normalize";
import { CLARITY_V1_JSON_SCHEMA, type ClarityV1Result } from "./schema";

const OPENAI_MODEL = "gpt-5-mini";

type ClarityV1FailureReason =
  | "missing_api_key"
  | "empty_input"
  | "http_not_ok"
  | "request_failed"
  | "response_missing"
  | "missing_message_content"
  | "json_parse_failure"
  | "invalid_payload"
  | "unusable_result";

const debugClarityV1 = (reason: ClarityV1FailureReason, details?: Record<string, unknown>) => {
  if (typeof __DEV__ === "undefined" || !__DEV__) {
    return;
  }

  console.debug("[clarity-v1]", reason, details ?? {});
};

const getOpenAiApiKey = () => {
  const extraCandidates = [
    Constants.expoConfig?.extra,
    (Constants as { manifest?: { extra?: Record<string, unknown> } }).manifest?.extra,
    (Constants as { manifest2?: { extra?: Record<string, unknown> } }).manifest2?.extra,
    (
      Constants as {
        manifest2?: { extra?: { expoClient?: { extra?: Record<string, unknown> } } };
      }
    ).manifest2?.extra?.expoClient?.extra,
  ];

  for (const extra of extraCandidates) {
    const key = extra?.openAIApiKey ?? extra?.OPENAI_API_KEY;
    if (typeof key === "string" && key.trim()) {
      return key.trim();
    }
  }

  return null;
};

export const requestClarityV1 = async (rawInput: string): Promise<ClarityV1Result | null> => {
  const apiKey = getOpenAiApiKey();
  const normalizedInput = rawInput.trim();

  if (!apiKey || !normalizedInput) {
    debugClarityV1(!apiKey ? "missing_api_key" : "empty_input");
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.1,
        max_completion_tokens: 350,
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
          { role: "user", content: normalizedInput },
        ],
      }),
    });

    if (!response.ok) {
      debugClarityV1("http_not_ok", { status: response.status, statusText: response.statusText });
      return null;
    }

    const payload = await response.json();
    if (!payload) {
      debugClarityV1("response_missing");
      return null;
    }

    const rawContent = payload?.choices?.[0]?.message?.content;
    const content =
      typeof rawContent === "string"
        ? rawContent
        : Array.isArray(rawContent)
          ? rawContent
              .map((part) =>
                typeof part === "string"
                  ? part
                  : typeof part?.text === "string"
                    ? part.text
                    : ""
              )
              .join("")
          : "";
    if (!content.trim()) {
      debugClarityV1("missing_message_content");
      return null;
    }

    try {
      const normalized = normalizeClarityV1Result(JSON.parse(content));
      if (!normalized) {
        debugClarityV1("unusable_result");
        return null;
      }

      return normalized;
    } catch {
      debugClarityV1("json_parse_failure");
      return null;
    }
  } catch {
    debugClarityV1("request_failed");
    return null;
  }
};
