import Constants from "expo-constants";
import type { AiCleanupResult } from "../types/ai-cleanup";

const OPENAI_MODEL = "gpt-5-mini";
const SIMPLE_BINARY_LEAD =
  /^(?:do i|should i|whether to|decide whether to|deciding whether to|i(?:['’]m| am)\s+(?:still\s+)?deciding whether to|need to\s+(?:still\s+)?decide whether to)\b/i;
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
  /\bbest first option\b/i,
  /\bother options\b/i,
  /\bdecision\b:/i,
];
const AI_CONTEXT_ONLY_PATTERNS = [
  /^\s*(?:but\s+)?i(?:['’]m| am)\s+(?:very\s+)?(?:hungry|tired|exhausted|drained|low energy|burned out|burnt out)\b/i,
  /^\s*(?:but\s+)?(?:money|cash flow)\b.+\b(?:would help|helps)\b/i,
  /^\s*i urgently need cash flow soon\b/i,
  /^\s*(?:but\s+)?it won[’']?t directly bring in money today\b/i,
  /^\s*(?:so\s+)?i need the clearest next move\b/i,
];
const AI_ACTION_VERB_PATTERNS = [
  /\b(?:call|email|send|fix|finish|rest|book|schedule|wait|reply|follow up|cold email|cold call|cold calling|clean up|cleanup|prioriti[sz]e|focus on|keep|switch|choose|pay|invoice|ship|submit|review|reach out|outreach|delegate|automate|reduce|ignore|quit|resign|sign|buy|sell|move|start|stop|eat|prepare|ask|contact)\b/i,
];
const AI_OPTION_NOUN_PATTERNS = [
  /\b(?:proposal|invoice|contract|email|website|rent|landlord|meeting|clients?|outreach|cold email|cold calling|call|rest|break)\b/i,
];

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
const stripOrdinalListPrefix = (value: string) =>
  value
    .replace(/^\s*(?:\((?:[1-5])\)|[1-5][.:]|(?:one|two|three|four|five|first|second|third|fourth|fifth):)\s*/i, "")
    .trim();

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

const stripAiMetaLead = (value: string) =>
  value
    .replace(
      /^(?:the real options are|real options are|the options are|actually handle first|actually do first|handle first|do first|what should (?:i\s+)?actually do first(?:,?\s*what should come second,?\s*and?\s*what can wait)?|what should come second|what can wait|what should wait|what to do (?:now|next|first)|which is the cleaner move|which is the clearer shape|this looks like the move|this looks like the clearer option|here(?:['’]?)s the cleaner option|here(?:['’]?)s the clearer shape|best first option|other options|decision)\s*[:,-]?\s*/i,
      ""
    )
    .replace(/^(?:and|but|so|also|then)\s+/i, "")
    .trim();

const stripAiContextTail = (value: string) =>
  value
    .replace(/\s*,?\s*(?:even though|although|though|despite)\s+.+$/i, "")
    .replace(/\s+\b(?:because|since|as)\b\s+.+$/i, "")
    .replace(/\s+\bbut\b\s+.+$/i, "")
    .trim();

const stripTrailingConjunction = (value: string) => value.replace(/\b(?:or|and|but)\s*$/i, "").trim();
const isAiMetaLanguage = (value: string) => AI_META_PATTERNS.some((pattern) => pattern.test(value));
const isAiContextOnly = (value: string) => AI_CONTEXT_ONLY_PATTERNS.some((pattern) => pattern.test(value));
const hasAiActionVerb = (value: string) => AI_ACTION_VERB_PATTERNS.some((pattern) => pattern.test(value));
const hasAiOptionNoun = (value: string) => AI_OPTION_NOUN_PATTERNS.some((pattern) => pattern.test(value));

const stripConditionalLead = (value: string) =>
  value
    .replace(/^if\s+(?:i|we)\s+/i, "")
    .replace(/^if\s+this\s+/i, "")
    .replace(/^(?:i|we)\s+(?:could|can|should|might|would)\s+/i, "")
    .replace(/^(?:actually|just)\s+/i, "")
    .trim();

const stripReasonTail = (value: string) =>
  value
    .replace(/,\s*(?:and\s+)?delaying\b.+$/i, "")
    .replace(/,\s*(?:and\s+)?(?:i|we|it|this|that)\s+(?:may|might|could|would|will)\b.+$/i, "")
    .replace(/\s+\band delaying\b.+$/i, "")
    .replace(/\s+\bwhich\b.+$/i, "")
    .replace(/\s+\bthat\b.+$/i, "")
    .replace(/\s+\bso\b.+$/i, "")
    .trim();

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

  if (/\bcontract\b/.test(normalized)) {
    return "contract";
  }

  if (/\bemail\b/.test(normalized)) {
    return "email";
  }

  return "";
};

const resolveImplicitActionObject = (value: string, rawInput: string) => {
  let nextValue = value;
  const inferredSendObject = inferSendObjectFromContext(rawInput);

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
    stripReasonTail(
      stripAiContextTail(
        resolveImplicitActionObject(
          stripConditionalLead(
            stripBinaryLead(
              stripOrdinalListPrefix(stripAiMetaLead(value.replace(/[.?!]+$/g, "").replace(/\s+/g, " ").trim()))
            )
          ),
          rawInput
        )
      )
    )
  );

  if (!sanitized || isAiMetaLanguage(sanitized) || isAiContextOnly(sanitized)) {
    return "";
  }

  if (!hasAiActionVerb(sanitized) && !hasAiOptionNoun(sanitized)) {
    return "";
  }

  return toSentenceCase(sanitized);
};

const getLabelJoiner = (titles: string[]) =>
  titles.length === 2 &&
  titles.every((title) => !/^(?:send|call|email|fix|rest|book|schedule|wait|move|take|keep|follow up|reply|start|eat|prepare|ask)\b/i.test(title))
    ? "vs"
    : "or";

const buildDecisionGroupLabelFromActions = (titles: string[]) => {
  if (!titles.length) {
    return "";
  }

  if (titles.length === 1) {
    return titles[0];
  }

  if (titles.length === 2) {
    return `${titles[0]} ${getLabelJoiner(titles)} ${titles[1]}`;
  }

  return `${titles.slice(0, 2).join(", ")}, and ${titles[2]}`;
};

const shouldRebuildDecisionGroupLabel = (value: string) =>
  !value ||
  isAiMetaLanguage(value) ||
  isAiContextOnly(value) ||
  /,\s*(?:and\s+)?(?:i|we|it|this|that)\s+(?:may|might|could|would|will)\b/i.test(value) ||
  /\bdelaying\b/i.test(value) ||
  /\b(?:because|which|that)\b/i.test(value) ||
  value.split(/\s+/).length > 10;

export const sanitizeAiDecisionGroupLabel = (
  value: string,
  actionTitles: string[],
  rawInput = ""
) => {
  const sanitized = stripTrailingConjunction(
    stripReasonTail(
      stripAiContextTail(
        resolveImplicitActionObject(
          stripConditionalLead(
            stripBinaryLead(
              stripOrdinalListPrefix(stripAiMetaLead(value.replace(/[.?!]+$/g, "").replace(/\s+/g, " ").trim()))
            )
          ),
          rawInput
        )
      )
    )
  );

  if (shouldRebuildDecisionGroupLabel(sanitized)) {
    return buildDecisionGroupLabelFromActions(actionTitles);
  }

  return toSentenceCase(sanitized);
};

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

const normalizeAiCleanupResult = (value: unknown, rawInput = ""): AiCleanupResult | null => {
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
      title: sanitizeAiActionTitle(action.title, rawInput),
      details: typeof action.details === "string" ? action.details.trim() : "",
      decision_group: action.decision_group.trim(),
    }))
    .filter((action) => action.title && action.decision_group)
    .slice(0, 8);

  const actionGroups = [...new Set(actions.map((action) => action.decision_group))];
  const decisionGroups = value.decision_groups
    .filter(
      (group): group is { id: string; label: string } =>
        Boolean(group) &&
        typeof group === "object" &&
        typeof group.id === "string" &&
        typeof group.label === "string"
    )
    .map((group) => {
      const groupId = group.id.trim();
      const groupActionTitles = actions
        .filter((action) => action.decision_group === groupId)
        .map((action) => action.title);

      return {
        id: groupId,
        label: sanitizeAiDecisionGroupLabel(group.label, groupActionTitles, rawInput),
      };
    })
    .filter((group) => group.id && actionGroups.includes(group.id))
    .slice(0, 6);

  const context = trimStringArray(value.context, 8);
  const tradeoffs = trimStringArray(value.tradeoffs, 8);

  if (!actions.length || !context || !tradeoffs) {
    return null;
  }

  const repairedDecisionGroups = actionGroups
    .map((groupId) => {
      const existingGroup = decisionGroups.find((group) => group.id === groupId);
      const actionTitles = actions
        .filter((action) => action.decision_group === groupId)
        .map((action) => action.title);
      const fallbackLabel = buildDecisionGroupLabelFromActions(actionTitles);
      const nextLabel = existingGroup?.label || fallbackLabel;

      return nextLabel ? { id: groupId, label: nextLabel } : null;
    })
    .filter((group): group is { id: string; label: string } => Boolean(group))
    .slice(0, 6);

  if (!repairedDecisionGroups.length) {
    return null;
  }

  return {
    decision_type: value.decision_type,
    actions,
    context,
    tradeoffs,
    decision_groups: repairedDecisionGroups,
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

    return binaryCleanup ?? normalizeAiCleanupResult(JSON.parse(content), rawInput);
  } catch {
    return binaryCleanup;
  }
};
