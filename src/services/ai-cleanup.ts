import Constants from "expo-constants";
import type { AiCleanupResult } from "../types/ai-cleanup";

const OPENAI_MODEL = "gpt-5-mini";

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
  "Never turn setup, framing, or meta-language into actions.",
  "Never coach, explain, or give advice.",
  "Return no markdown, no code fences, and no text outside the JSON schema.",
  "Action titles must be short, clean, and human-readable.",
].join(" ");

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

  if (!apiKey || !rawInput.trim()) {
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

    return normalizeAiCleanupResult(JSON.parse(content));
  } catch {
    return null;
  }
};
