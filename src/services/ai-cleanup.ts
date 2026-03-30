import Constants from "expo-constants";
import type { AiCleanupResult } from "../types/ai-cleanup";

const OPENAI_MODEL = "gpt-5-mini";
const SIMPLE_BINARY_LEAD =
  /^(?:do i|should i|whether to|decide whether to|deciding whether to|i(?:['’]m| am)\s+(?:still\s+)?deciding whether to|need to\s+(?:still\s+)?decide whether to)\b/i;

export const AI_CLEANUP_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["decision_type", "actions", "context", "tradeoffs", "decision_groups"],
  properties: {
    decision_type: {
      type: "string",
      enum: ["single_task", "option_choice", "multiple_decisions", "foggy_dump"],
    },
    actions: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "details", "decision_group"],
        properties: {
          title: { type: "string" },
          details: { type: "string" },
          decision_group: { type: "string" },
        },
      },
    },
    context: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
    tradeoffs: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
    decision_groups: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
        },
      },
    },
  },
} as const;

export const AI_CLEANUP_PROMPT = [
  "You normalize messy decision input into strict JSON only.",
  "Extract real actionable options or tasks.",
  "Keep context separate from actions.",
  "Keep tradeoffs short and concrete.",
  "For a simple binary X or Y choice, return exactly one decision_group with exactly two actions.",
  "Do not turn the second side of a binary choice into a separate decision.",
  "Strip conjunction leftovers like trailing 'or' from action titles.",
  "Keep context like hunger, tiredness, or stress out of action titles when possible.",
  "Never turn setup, framing, or meta-language into actions.",
  "Never coach, explain, or give advice.",
  "Return no markdown, no code fences, and no text outside the JSON schema.",
  "Action titles must be short, clean, and human-readable.",
].join(" ");

const toSentenceCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const stripBinaryLead = (value: string) =>
  value
    .replace(
      /^(?:do i|should i|whether to|decide whether to|deciding whether to|i(?:['’]m| am)\s+(?:still\s+)?deciding whether to|need to\s+(?:still\s+)?decide whether to)\s+/i,
      ""
    )
    .trim();

const stripBinaryContextTail = (value: string) =>
  value
    .replace(/\s*,?\s*(?:even though|although|though|despite)\s+.+$/i, "")
    .replace(/\s+\bbut\b\s+.+$/i, "")
    .replace(/\s+\b(?:because|since|as)\b\s+.+$/i, "")
    .replace(/\b(?:or|and|but)\s*$/i, "")
    .replace(/[.?!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeBinaryOptionTitle = (value: string) => {
  const normalized = stripBinaryContextTail(stripBinaryLead(value));
  return normalized ? toSentenceCase(normalized) : "";
};

const extractSimpleBinaryCleanup = (rawInput: string): AiCleanupResult | null => {
  const normalized = rawInput.replace(/\s+/g, " ").trim();
  const normalizedWithoutTail = normalized.replace(/[.?!]+$/g, "").trim();

  if (!SIMPLE_BINARY_LEAD.test(normalizedWithoutTail)) {
    return null;
  }

  if (/\b(?:also|plus)\b/i.test(normalizedWithoutTail)) {
    return null;
  }

  if ((normalizedWithoutTail.match(/\bor\b/gi) ?? []).length !== 1) {
    return null;
  }

  const parts = normalizedWithoutTail.split(/\s*,?\s+or\s+/i);
  if (parts.length !== 2) {
    return null;
  }

  const left = normalizeBinaryOptionTitle(parts[0]);
  const right = normalizeBinaryOptionTitle(parts[1]);

  if (!left || !right) {
    return null;
  }

  const context: string[] = [];
  const tradeoffs: string[] = [];

  if (/\b(?:hungry|very hungry|tired|exhausted|drained|low energy)\b/i.test(normalizedWithoutTail)) {
    context.push("Very hungry or low energy");
  }

  if (/\bduring (?:my\s+)?lunch(?: break)?\b/i.test(normalizedWithoutTail) && /\bafter lunch\b/i.test(normalizedWithoutTail)) {
    tradeoffs.push("Sooner vs better energy");
  }

  const joiner = /\b(?:clients?|email|cold email|cold calling|calling|outreach)\b/i.test(`${left} ${right}`) ? "vs" : "or";
  const label = `${left} ${joiner} ${right}`;

  return {
    decision_type: "option_choice",
    actions: [
      { title: left, details: "", decision_group: "group-1" },
      { title: right, details: "", decision_group: "group-1" },
    ],
    context,
    tradeoffs,
    decision_groups: [{ id: "group-1", label }],
  };
};

const trimStringArray = (values: unknown, maxItems: number) => {
  if (!Array.isArray(values)) {
    return null;
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

const isAiCleanupResult = (value: unknown): value is AiCleanupResult => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybeResult = value as Record<string, unknown>;
  const decisionType = maybeResult.decision_type;

  if (
    decisionType !== "single_task" &&
    decisionType !== "option_choice" &&
    decisionType !== "multiple_decisions" &&
    decisionType !== "foggy_dump"
  ) {
    return false;
  }

  if (!Array.isArray(maybeResult.actions) || !Array.isArray(maybeResult.decision_groups)) {
    return false;
  }

  return true;
};

const normalizeAiCleanupResult = (value: unknown): AiCleanupResult | null => {
  if (!isAiCleanupResult(value)) {
    return null;
  }

  const actions = value.actions
    .filter(
      (action): action is { title: string; details?: string; decision_group: string } =>
        Boolean(action) &&
        typeof action === "object" &&
        typeof action.title === "string" &&
        typeof action.decision_group === "string"
    )
    .map((action) => ({
      title: action.title.trim(),
      details: typeof action.details === "string" ? action.details.trim() : "",
      decision_group: action.decision_group.trim(),
    }))
    .filter((action) => action.title && action.decision_group)
    .slice(0, 8);

  const decisionGroups = value.decision_groups
    .filter(
      (group): group is { id: string; label: string } =>
        Boolean(group) &&
        typeof group === "object" &&
        typeof group.id === "string" &&
        typeof group.label === "string"
    )
    .map((group) => ({
      id: group.id.trim(),
      label: group.label.trim(),
    }))
    .filter((group) => group.id && group.label)
    .slice(0, 6);

  const context = trimStringArray(value.context, 8);
  const tradeoffs = trimStringArray(value.tradeoffs, 8);

  if (!actions.length || !decisionGroups.length || !context || !tradeoffs) {
    return null;
  }

  return {
    decision_type: value.decision_type,
    actions,
    context,
    tradeoffs,
    decision_groups: decisionGroups,
  };
};

export const canUseAiCleanup = () => Boolean(getOpenAiApiKey());

export const cleanupClarityInputWithAi = async (rawInput: string): Promise<AiCleanupResult | null> => {
  const apiKey = getOpenAiApiKey();
  const binaryCleanup = extractSimpleBinaryCleanup(rawInput);

  if (!apiKey || !rawInput.trim()) {
    return binaryCleanup;
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
            name: "clarity_cleanup",
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
      return null;
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      return null;
    }

    return binaryCleanup ?? normalizeAiCleanupResult(JSON.parse(content));
  } catch {
    return binaryCleanup;
  }
};
