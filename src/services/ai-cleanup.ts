import Constants from "expo-constants";
import type { AiCleanupResult } from "../types/ai-cleanup";

const OPENAI_MODEL = "gpt-4.1-mini";

const AI_META_PATTERNS = [
  /\bwhat should (?:i\s+)?actually do first\b/i,
  /\bwhat should come second\b/i,
  /\bwhat can wait\b/i,
  /\bwhat should wait\b/i,
  /\bwhat to do (?:now|next|first)\b/i,
  /\bhandle first\b/i,
  /\bactually handle first\b/i,
  /\bactually do first\b/i,
  /\bthe real options are\b/i,
  /\breal options are\b/i,
  /\bthe options are\b/i,
  /\bbest next move\b/i,
  /\bbest first option\b/i,
  /\bclearest next move\b/i,
  /\bdecision\b:/i,
];

const AI_CONTEXT_ONLY_PATTERNS = [
  /^\s*(?:but\s+)?i(?:['’]m| am)\s+(?:very\s+)?(?:hungry|tired|exhausted|drained|low energy|burned out|burnt out)\b/i,
  /^(?:but\s+)?i feel overwhelmed\b/i,
  /^(?:but\s+)?i(?:\s+do\s+not|\s+don't)?\s+want clarity\b/i,
  /^(?:but\s+)?i(?:\s+do\s+not|\s+don't)?\s+want to make (?:the )?(?:wrong move|a mistake)\b/i,
  /\bout of panic\b/i,
  /^\s*(?:but\s+)?(?:money|cash flow)\b.+\b(?:would help|helps)\b/i,
  /^\s*i urgently need cash flow soon\b/i,
  /^\s*(?:but\s+)?it won[’']?t directly bring in money today\b/i,
  /^\s*(?:so\s+)?i need the clearest next move\b/i,
];

const AI_ACTION_VERB_PATTERNS = [
  /\b(?:call|email|send|fix|finish|rest|book|schedule|wait|reply|follow up|cold email|cold call|cold calling|clean up|cleanup|prioriti[sz]e|focus on|keep|switch|choose|pay|invoice|ship|submit|review|reach out|outreach|delegate|automate|reduce|ignore|quit|resign|sign|buy|sell|start|stop|eat|prepare|ask|contact)\b/i,
];

const AI_OPTION_NOUN_PATTERNS = [
  /\b(?:proposal|invoice|contract|email|website|rent|landlord|meeting|clients?|client|lead|timing|outreach|cold email|cold calling|call|rest|break)\b/i,
];

export const AI_CLEANUP_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["considered_items", "best_next_move", "why_first", "still_in_play", "what_can_wait", "context_notes"],
  properties: {
    considered_items: {
      type: "array",
      maxItems: 5,
      items: { type: "string" },
    },
    best_next_move: { type: "string" },
    why_first: { type: "string" },
    still_in_play: {
      type: "array",
      maxItems: 3,
      items: { type: "string" },
    },
    what_can_wait: {
      type: "array",
      maxItems: 3,
      items: { type: "string" },
    },
    context_notes: {
      type: "array",
      maxItems: 5,
      items: { type: "string" },
    },
  },
} as const;

export const AI_CLEANUP_PROMPT = [
  "You are Clarity V1 for a specialized decision tool.",
  "Return strict JSON only.",
  "Read the full messy input and preserve the whole picture without turning it into a huge list.",
  "Use these principles internally: urgency, importance, cost of delay, reversibility, friction, energy fit, upside, and Eisenhower-style prioritization.",
  "Do not output the scores. Use them only to choose and order the result.",
  "Extract 3 to 5 meaningful items when present. If the input truly contains fewer, return fewer.",
  "Never turn meta-language, setup wording, reflective language, or emotional framing into items.",
  "Keep the output compact and specialized, not chatty.",
  "best_next_move must be exactly one short clean action title.",
  "why_first must briefly explain why it leads over the other meaningful items right now.",
  "still_in_play should contain meaningful remaining items that still matter.",
  "what_can_wait should contain lower-pressure items only.",
  "context_notes should be short constraints or pressure notes like low energy, cash pressure, timing pressure, or relationship pressure.",
  "No markdown, no code fences, and no commentary outside the JSON.",
].join(" ");

type AiCleanupFailureReason =
  | "missing_api_key"
  | "empty_input"
  | "http_not_ok"
  | "request_failed"
  | "missing_message_content"
  | "json_parse_failure"
  | "invalid_schema_shape"
  | "zero_surviving_items"
  | "missing_best_next_move"
  | "response_missing";

const debugAiCleanup = (reason: AiCleanupFailureReason, details?: Record<string, unknown>) => {
  if (typeof __DEV__ === "undefined" || !__DEV__) {
    return;
  }

  console.debug("[ai-cleanup]", reason, details ?? {});
};

const toSentenceCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const dedupeStrings = (values: string[]) => {
  const seen = new Set<string>();

  return values.filter((value) => {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const stripOrdinalListPrefix = (value: string) =>
  value
    .replace(/^\s*(?:\((?:[1-5])\)|[1-5][.:]|(?:one|two|three|four|five|first|second|third|fourth|fifth):)\s*/i, "")
    .trim();

const stripAiMetaLead = (value: string) =>
  value
    .replace(
      /^(?:the real options are|real options are|the options are|actually handle first|actually do first|handle first|do first|what should (?:i\s+)?actually do first(?:,?\s*what should come second,?\s*and?\s*what can wait)?|what should come second|what can wait|what should wait|what to do (?:now|next|first)|which is the cleaner move|which is the clearer shape|this looks like the move|this looks like the clearer option|here(?:['’]?)s the cleaner option|here(?:['’]?)s the clearer shape|best next move|best first option|clearest next move|decision)\s*[:,-]?\s*/i,
      ""
    )
    .replace(/^(?:and|but|so|also|then)\s+/i, "")
    .trim();

const stripConditionalLead = (value: string) =>
  value
    .replace(/^if\s+(?:i|we)\s+/i, "")
    .replace(/^(?:i|we)\s+(?:could|can|should|might|would)\s+/i, "")
    .replace(/^(?:actually|just)\s+/i, "")
    .trim();

const stripContextTail = (value: string) =>
  value
    .replace(/\s*,?\s*(?:even though|although|though|despite)\s+.+$/i, "")
    .replace(/\s+\b(?:because|since|as)\b\s+.+$/i, "")
    .replace(/\s+\bbut\b\s+.+$/i, "")
    .replace(/\s+\bwhich\b.+$/i, "")
    .replace(/\s+\bthat\b.+$/i, "")
    .replace(/\s+\bso\b.+$/i, "")
    .trim();

const stripTrailingConjunction = (value: string) => value.replace(/\b(?:or|and|but)\s*$/i, "").trim();

const isAiMetaLanguage = (value: string) => AI_META_PATTERNS.some((pattern) => pattern.test(value));
const isAiContextOnly = (value: string) => AI_CONTEXT_ONLY_PATTERNS.some((pattern) => pattern.test(value));
const hasAiActionVerb = (value: string) => AI_ACTION_VERB_PATTERNS.some((pattern) => pattern.test(value));
const hasAiOptionNoun = (value: string) => AI_OPTION_NOUN_PATTERNS.some((pattern) => pattern.test(value));

const hasUsableActionShape = (value: string) => hasAiActionVerb(value) || hasAiOptionNoun(value);

const inferSendObjectFromContext = (rawInput: string) => {
  const normalized = rawInput.toLowerCase();

  if (/\bproposal\b/.test(normalized)) {
    const clientTarget = normalized.match(/\b(?:to|for)\s+(?:a\s+)?(us|american|dubai|uk|eu|local|international)\s+client\b/i);
    if (clientTarget) {
      const region = clientTarget[1].toUpperCase() === "US" ? "US" : toSentenceCase(clientTarget[1].toLowerCase());
      return `proposal to ${region} client`;
    }

    return "proposal";
  }

  if (/\binvoice\b/.test(normalized)) {
    return "invoice";
  }

  return "";
};

const resolveImplicitActionObject = (value: string, rawInput: string) => {
  const inferredSendObject = inferSendObjectFromContext(rawInput);
  let nextValue = value;

  if (inferredSendObject) {
    nextValue = nextValue
      .replace(/\bsend it\b/i, `send ${inferredSendObject}`)
      .replace(/\bsend this\b/i, `send ${inferredSendObject}`);
  }

  if (/\breach out\b/i.test(nextValue) && /\brent timing\b/i.test(rawInput.toLowerCase())) {
    nextValue = nextValue.replace(/\breach out\b/i, "reach out about rent timing");
  }

  return nextValue
    .replace(/\breach out soon about\b/i, "reach out about")
    .replace(/\breach out soon\b/i, "reach out")
    .replace(/\bcontact soon\b/i, "contact")
    .trim();
};

export const sanitizeAiActionTitle = (value: string, rawInput = "") => {
  const sanitized = stripTrailingConjunction(
    stripContextTail(
      resolveImplicitActionObject(
        stripConditionalLead(
          stripAiMetaLead(stripOrdinalListPrefix(value.replace(/[.?!]+$/g, "").replace(/\s+/g, " ").trim()))
        ),
        rawInput
      )
    )
  );

  if (!sanitized || isAiMetaLanguage(sanitized) || isAiContextOnly(sanitized)) {
    return "";
  }

  if (!hasUsableActionShape(sanitized)) {
    return "";
  }

  return toSentenceCase(sanitized);
};

export const sanitizeAiDecisionGroupLabel = (value: string, actionTitles: string[], rawInput = "") => {
  const cleaned = sanitizeAiActionTitle(value, rawInput);
  if (cleaned) {
    return cleaned;
  }

  const rebuilt = dedupeStrings(actionTitles.map((title) => sanitizeBoardItem(title, rawInput)).filter(Boolean)).slice(0, 3);
  if (!rebuilt.length) {
    return "";
  }

  if (rebuilt.length === 1) {
    return rebuilt[0];
  }

  if (rebuilt.length === 2) {
    return `${rebuilt[0]} or ${rebuilt[1]}`;
  }

  return `${rebuilt[0]}, ${rebuilt[1]}, and ${rebuilt[2]}`;
};

const sanitizeBoardItem = (value: string, rawInput = "") =>
  sanitizeAiActionTitle(value, rawInput) ||
  (() => {
    const cleaned = stripTrailingConjunction(
      resolveImplicitActionObject(stripAiMetaLead(stripOrdinalListPrefix(value.replace(/[.?!]+$/g, "").replace(/\s+/g, " ").trim())), rawInput)
    );

    if (!cleaned || isAiMetaLanguage(cleaned) || isAiContextOnly(cleaned) || !hasUsableActionShape(cleaned)) {
      return "";
    }

    return toSentenceCase(cleaned);
  })();

const sanitizeContextNote = (value: string) => {
  const cleaned = stripTrailingConjunction(stripContextTail(stripAiMetaLead(stripOrdinalListPrefix(value.replace(/[.?!]+$/g, "").replace(/\s+/g, " ").trim()))));
  if (!cleaned || isAiMetaLanguage(cleaned)) {
    return "";
  }

  return toSentenceCase(cleaned);
};

const sanitizeWhyFirst = (value: string) => {
  const cleaned = stripTrailingConjunction(
    stripConditionalLead(stripAiMetaLead(stripOrdinalListPrefix(value.replace(/\s+/g, " ").trim())))
  ).replace(/[.]+$/g, "");

  if (!cleaned || isAiMetaLanguage(cleaned) || isAiContextOnly(cleaned)) {
    return "";
  }

  return `${cleaned}.`;
};

const trimStringArray = (values: unknown, maxItems: number) => {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, maxItems);
};

const getOpenAiApiKey = () => {
  const extraKey = Constants.expoConfig?.extra?.openAIApiKey;

  return typeof extraKey === "string" && extraKey.trim() ? extraKey.trim() : null;
};

const isAiCleanupPayloadLike = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeResult = value as Record<string, unknown>;
  return Array.isArray(maybeResult.considered_items) || typeof maybeResult.best_next_move === "string";
};

const normalizeAiCleanupResult = (value: unknown, rawInput = ""): AiCleanupResult | null => {
  if (!isAiCleanupPayloadLike(value)) {
    debugAiCleanup("invalid_schema_shape");
    return null;
  }

  const payload = value as Record<string, unknown>;
  const consideredItems = dedupeStrings(
    trimStringArray(payload.considered_items, 5).map((item) => sanitizeBoardItem(item, rawInput)).filter(Boolean)
  ).slice(0, 5);
  const bestNextMove = sanitizeBoardItem(typeof payload.best_next_move === "string" ? payload.best_next_move : "", rawInput);
  const stillInPlay = dedupeStrings(
    trimStringArray(payload.still_in_play, 3)
      .map((item) => sanitizeBoardItem(item, rawInput))
      .filter((item) => item && item.toLowerCase() !== bestNextMove.toLowerCase())
  ).slice(0, 3);
  const whatCanWait = dedupeStrings(
    trimStringArray(payload.what_can_wait, 3)
      .map((item) => sanitizeBoardItem(item, rawInput))
      .filter((item) => item && item.toLowerCase() !== bestNextMove.toLowerCase() && !stillInPlay.some((candidate) => candidate.toLowerCase() === item.toLowerCase()))
  ).slice(0, 3);
  const contextNotes = dedupeStrings(
    trimStringArray(payload.context_notes, 5).map(sanitizeContextNote).filter(Boolean)
  ).slice(0, 5);

  const fullBoard = dedupeStrings([bestNextMove, ...consideredItems, ...stillInPlay, ...whatCanWait].filter(Boolean)).slice(0, 5);
  const nextMove = bestNextMove || fullBoard[0] || "";

  if (!nextMove) {
    debugAiCleanup("missing_best_next_move");
    return null;
  }

  if (!fullBoard.length) {
    debugAiCleanup("zero_surviving_items");
    return null;
  }

  const whyFirst = sanitizeWhyFirst(typeof payload.why_first === "string" ? payload.why_first : "");

  return {
    considered_items: fullBoard,
    best_next_move: nextMove,
    why_first: whyFirst || "This has the clearest mix of pressure, payoff, and fit right now.",
    still_in_play: stillInPlay.filter((item) => !fullBoard.slice(0, 1).some((candidate) => candidate.toLowerCase() === item.toLowerCase())),
    what_can_wait: whatCanWait,
    context_notes: contextNotes,
  };
};

export const canUseAiCleanup = () => Boolean(getOpenAiApiKey());

export const cleanupClarityInputWithAi = async (rawInput: string): Promise<AiCleanupResult | null> => {
  const apiKey = getOpenAiApiKey();

  if (!apiKey || !rawInput.trim()) {
    debugAiCleanup(!apiKey ? "missing_api_key" : "empty_input");
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
        max_tokens: 600,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "clarity_v1",
            strict: true,
            schema: AI_CLEANUP_JSON_SCHEMA,
          },
        },
        messages: [
          {
            role: "system",
            content: AI_CLEANUP_PROMPT,
          },
          {
            role: "user",
            content: rawInput.trim(),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      debugAiCleanup("http_not_ok", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody.slice(0, 500),
      });
      return null;
    }

    const payload = await response.json();
    if (!payload) {
      debugAiCleanup("response_missing");
      return null;
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      debugAiCleanup("missing_message_content");
      return null;
    }

    try {
      return normalizeAiCleanupResult(JSON.parse(content), rawInput);
    } catch {
      debugAiCleanup("json_parse_failure");
      return null;
    }
  } catch {
    debugAiCleanup("request_failed");
    return null;
  }
};
