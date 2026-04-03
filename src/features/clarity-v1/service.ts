import { normalizeClarityV1Result } from "./normalize";
import type { ClarityV1Result } from "./schema";

type ClarityV1FailureReason =
  | "empty_input"
  | "http_not_ok"
  | "request_failed"
  | "response_missing"
  | "invalid_payload"
  | "unusable_result";

const debugClarityV1 = (reason: ClarityV1FailureReason, details?: Record<string, unknown>) => {
  if (typeof __DEV__ === "undefined" || !__DEV__) {
    return;
  }

  console.debug("[clarity-v1]", reason, details ?? {});
};

export const requestClarityV1 = async (rawInput: string): Promise<ClarityV1Result | null> => {
  const normalizedInput = rawInput.trim();

  if (!normalizedInput) {
    debugClarityV1("empty_input");
    return null;
  }

  try {
    const response = await fetch("/clarity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ rawInput: normalizedInput }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      debugClarityV1("http_not_ok", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody.slice(0, 500),
      });
      return null;
    }

    const payload = await response.json();
    if (!payload) {
      debugClarityV1("response_missing");
      return null;
    }

    const normalized = normalizeClarityV1Result(payload);
    if (!normalized) {
      debugClarityV1("invalid_payload");
      return null;
    }

    if (!normalized.considered_items.length) {
      debugClarityV1("unusable_result");
      return null;
    }

    return normalized;
  } catch {
    debugClarityV1("request_failed");
    return null;
  }
};
