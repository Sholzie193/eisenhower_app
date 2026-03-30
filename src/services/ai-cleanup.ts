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
  required: ["decision_type", "summary", "items", "context", "tradeoffs", "decision_groups", "presentation"],
  properties: {
    decision_type: {
      type: "string",
      enum: ["single_task", "option_choice", "multiple_decisions", "foggy_dump"],
    },
    summary: {
      type: "object",
      additionalProperties: false,
      required: ["situation", "primary_recommendation", "primary_reason"],
      properties: {
        situation: { type: "string" },
        primary_recommendation: { type: "string" },
        primary_reason: { type: "string" },
      },
    },
    items: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "title",
          "details",
          "type",
          "decision_group",
          "quadrant",
          "urgency",
          "importance",
          "cost_of_delay",
          "reversibility",
          "friction",
          "energy_fit",
          "upside",
          "why",
        ],
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          details: { type: "string" },
          type: { type: "string", enum: ["task", "option", "obligation"] },
          decision_group: { type: "string" },
          quadrant: { type: "string", enum: ["do_now", "schedule", "delegate", "eliminate"] },
          urgency: { type: "integer", minimum: 1, maximum: 5 },
          importance: { type: "integer", minimum: 1, maximum: 5 },
          cost_of_delay: { type: "integer", minimum: 1, maximum: 5 },
          reversibility: { type: "integer", minimum: 1, maximum: 5 },
          friction: { type: "integer", minimum: 1, maximum: 5 },
          energy_fit: { type: "integer", minimum: 1, maximum: 5 },
          upside: { type: "integer", minimum: 1, maximum: 5 },
          why: { type: "string" },
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
    presentation: {
      type: "object",
      additionalProperties: false,
      required: ["show_now", "show_next", "show_later"],
      properties: {
        show_now: {
          type: "array",
          maxItems: 4,
          items: { type: "string" },
        },
        show_next: {
          type: "array",
          maxItems: 5,
          items: { type: "string" },
        },
        show_later: {
          type: "array",
          maxItems: 8,
          items: { type: "string" },
        },
      },
    },
  },
} as const;

export const AI_CLEANUP_PROMPT = [
  "You are the structured Clarity intake layer for a specialized decision tool.",
  "Return strict JSON only.",
  "Read the full messy input and preserve the whole picture before any narrowing.",
  "Extract all meaningful tasks, options, or obligations mentioned, up to 5 real actions when present.",
  "Do not drop a real action because another item seems more urgent, important, or likely to win later.",
  "Never turn setup language, meta-language, reflective or emotional framing, or context-only statements into items.",
  "Keep context separate from items. Keep tradeoffs separate from items.",
  "Use only this framework for each item: urgency, importance, cost_of_delay, reversibility, friction, energy_fit, upside, and quadrant.",
  "Quadrants mean: do_now for urgent and meaningful items, schedule for meaningful but less immediate items, delegate for items that should move but do not deserve full direct effort, eliminate for low-importance low-upside items.",
  "Use stable 1 to 5 scores. 5 means stronger or more present. For friction, 5 means harder to execute. For reversibility, 5 means easier to undo or adjust. For energy_fit, 5 means it fits current capacity well.",
  "The AI does structured intake and classification. It does not coach, freestyle, or act like a chatbot.",
  "For a simple binary choice, return one decision group with exactly two items.",
  "For multiple separate compare decisions, preserve them as separate decision groups.",
  "For one crowded dilemma with several priorities, preserve all real items together and use presentation.show_now/show_next/show_later to keep the UI calm.",
  "Action titles must be short, clean, and human-readable.",
  "Keep details, context, and tradeoffs brief and concrete.",
  "No markdown, no code fences, and no commentary outside the JSON.",
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

const hasUsableActionShape = (value: string) => hasAiActionVerb(value) || hasAiOptionNoun(value);

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

const salvageAiActionTitle = (title: string, details = "", rawInput = "") => {
  const direct = sanitizeAiActionTitle(title, rawInput);
  if (direct) {
    return direct;
  }

  const detailOnly = details ? sanitizeAiActionTitle(details, rawInput) : "";
  if (detailOnly) {
    return detailOnly;
  }

  const combined = sanitizeAiActionTitle([title, details].filter(Boolean).join(". "), rawInput);
  if (combined) {
    return combined;
  }

  const lightlyCleaned = stripTrailingConjunction(
    stripReasonTail(
      stripAiContextTail(
        resolveImplicitActionObject(
          stripConditionalLead(
            stripBinaryLead(
              stripOrdinalListPrefix(stripAiMetaLead(title.replace(/[.?!]+$/g, "").replace(/\s+/g, " ").trim()))
            )
          ),
          rawInput
        )
      )
    )
  );

  if (!lightlyCleaned || isAiMetaLanguage(lightlyCleaned) || isAiContextOnly(lightlyCleaned)) {
    return "";
  }

  return hasUsableActionShape(lightlyCleaned) ? toSentenceCase(lightlyCleaned) : "";
};

const preserveLightlyCleanedActionTitle = (title: string, details = "", rawInput = "") => {
  const lightlyCleaned = stripTrailingConjunction(
    stripAiContextTail(
      resolveImplicitActionObject(
        stripConditionalLead(
          stripBinaryLead(
            stripOrdinalListPrefix(stripAiMetaLead([title, details].filter(Boolean).join(". ").replace(/[.?!]+$/g, "").replace(/\s+/g, " ").trim()))
          )
        ),
        rawInput
      )
    )
  );

  if (!lightlyCleaned || isAiMetaLanguage(lightlyCleaned) || isAiContextOnly(lightlyCleaned)) {
    return "";
  }

  return hasUsableActionShape(lightlyCleaned) ? toSentenceCase(lightlyCleaned) : "";
};

const sanitizeAiSummaryText = (value: string) =>
  stripTrailingConjunction(
    stripReasonTail(
      stripAiContextTail(stripOrdinalListPrefix(stripAiMetaLead(value.replace(/[.?!]+$/g, "").replace(/\s+/g, " ").trim())))
    )
  );

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

  if (
    !maybeResult.summary ||
    typeof maybeResult.summary !== "object" ||
    !Array.isArray(maybeResult.items) ||
    !Array.isArray(maybeResult.decision_groups) ||
    !maybeResult.presentation ||
    typeof maybeResult.presentation !== "object"
  ) {
    return false;
  }

  return true;
};

const normalizeAiCleanupResult = (value: unknown, rawInput = ""): AiCleanupResult | null => {
  if (!isAiCleanupResult(value)) {
    return null;
  }

  const summaryInput = value.summary as unknown as Record<string, unknown>;
  const summary = {
    situation:
      typeof summaryInput.situation === "string" && sanitizeAiSummaryText(summaryInput.situation)
        ? sanitizeAiSummaryText(summaryInput.situation)
        : "The full situation came through, so the app kept the read structured and calm.",
    primary_recommendation:
      typeof summaryInput.primary_recommendation === "string" && sanitizeAiSummaryText(summaryInput.primary_recommendation)
        ? sanitizeAiSummaryText(summaryInput.primary_recommendation)
        : "Start with the clearest next move.",
    primary_reason:
      typeof summaryInput.primary_reason === "string" && sanitizeAiSummaryText(summaryInput.primary_reason)
        ? sanitizeAiSummaryText(summaryInput.primary_reason)
        : "The recommendation is based on the strongest mix of pressure, importance, and fit.",
  };

  const items = value.items
    .filter(
      (
        item
      ): item is {
        id: string;
        title: string;
        details?: string;
        type: "task" | "option" | "obligation";
        decision_group: string;
        quadrant: "do_now" | "schedule" | "delegate" | "eliminate";
        urgency: number;
        importance: number;
        cost_of_delay: number;
        reversibility: number;
        friction: number;
        energy_fit: number;
        upside: number;
        why: string;
      } =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.decision_group === "string" &&
        typeof item.type === "string" &&
        typeof item.quadrant === "string"
    )
    .map((item, index) => {
      const details = typeof item.details === "string" ? item.details.trim() : "";
      const title =
        salvageAiActionTitle(item.title, details, rawInput) ||
        preserveLightlyCleanedActionTitle(item.title, details, rawInput);

      if (!title && typeof __DEV__ !== "undefined" && __DEV__) {
        console.debug("[ai-cleanup] dropped action after normalization", {
          rawTitle: item.title,
          rawDetails: details,
          decisionGroup: item.decision_group,
        });
      }

      return {
        id: item.id.trim() || `item-${index + 1}`,
        title,
        details,
        type: item.type,
        decision_group: item.decision_group.trim() || "group-1",
        quadrant: item.quadrant,
        urgency: Math.max(1, Math.min(5, Number(item.urgency) || 3)),
        importance: Math.max(1, Math.min(5, Number(item.importance) || 3)),
        cost_of_delay: Math.max(1, Math.min(5, Number(item.cost_of_delay) || 3)),
        reversibility: Math.max(1, Math.min(5, Number(item.reversibility) || 3)),
        friction: Math.max(1, Math.min(5, Number(item.friction) || 3)),
        energy_fit: Math.max(1, Math.min(5, Number(item.energy_fit) || 3)),
        upside: Math.max(1, Math.min(5, Number(item.upside) || 3)),
        why:
          typeof item.why === "string" && sanitizeAiSummaryText(item.why)
            ? sanitizeAiSummaryText(item.why)
            : "This is one of the meaningful items in the situation.",
      };
    })
    .filter((item) => item.title && item.decision_group)
    .slice(0, 8);

  const itemGroups = [...new Set(items.map((item) => item.decision_group))];
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
      const groupActionTitles = items
        .filter((item) => item.decision_group === groupId)
        .map((item) => item.title);

      return {
        id: groupId,
        label: sanitizeAiDecisionGroupLabel(group.label, groupActionTitles, rawInput),
      };
    })
    .filter((group) => group.id && itemGroups.includes(group.id))
    .slice(0, 6);

  const context = trimStringArray(value.context, 8);
  const tradeoffs = trimStringArray(value.tradeoffs, 8);
  const presentationInput = value.presentation as unknown as Record<string, unknown>;
  const presentation = {
    show_now: trimStringArray(presentationInput.show_now, 4) ?? [],
    show_next: trimStringArray(presentationInput.show_next, 5) ?? [],
    show_later: trimStringArray(presentationInput.show_later, 8) ?? [],
  };

  if (!items.length || !context || !tradeoffs) {
    return null;
  }

  const repairedDecisionGroups = itemGroups
    .map((groupId) => {
      const existingGroup = decisionGroups.find((group) => group.id === groupId);
      const actionTitles = items
        .filter((item) => item.decision_group === groupId)
        .map((item) => item.title);
      const fallbackLabel = buildDecisionGroupLabelFromActions(actionTitles);
      const nextLabel = existingGroup?.label || fallbackLabel;

      return nextLabel ? { id: groupId, label: nextLabel } : null;
    })
    .filter((group): group is { id: string; label: string } => Boolean(group))
    .slice(0, 6);

  if (!repairedDecisionGroups.length) {
    return null;
  }

  const survivingIds = new Set(items.map((item) => item.id));
  const normalizePresentationIds = (ids: string[]) =>
    ids.filter((id, index, list) => survivingIds.has(id) && list.indexOf(id) === index);

  const normalizedPresentation = {
    show_now: normalizePresentationIds(presentation.show_now),
    show_next: normalizePresentationIds(presentation.show_next),
    show_later: normalizePresentationIds(presentation.show_later),
  };

  if (!normalizedPresentation.show_now.length) {
    normalizedPresentation.show_now = [items[0].id];
  }

  return {
    decision_type: value.decision_type,
    summary,
    items,
    context,
    tradeoffs,
    decision_groups: repairedDecisionGroups,
    presentation: normalizedPresentation,
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
        max_completion_tokens: 650,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "clarity_decision_intake",
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

    return normalizeAiCleanupResult(JSON.parse(content), rawInput);
  } catch {
    return null;
  }
};
