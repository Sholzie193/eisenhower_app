import type { ClarityV1Result } from "./schema";

const META_PATTERNS = [
  /\bwhat should (?:i\s+)?actually do first\b/i,
  /\bwhat should come second\b/i,
  /\bwhat can wait\b/i,
  /\bwhat should wait\b/i,
  /\bthe real options are\b/i,
  /\breal options are\b/i,
  /\bthe options are\b/i,
  /\bclearest next move\b/i,
  /\bbest next move\b/i,
  /\bdecision\b:/i,
];

const CONTEXT_ONLY_PATTERNS = [
  /^(?:but\s+)?i feel overwhelmed\b/i,
  /^(?:but\s+)?i(?:['’]m| am)\s+(?:very\s+)?(?:hungry|tired|exhausted|drained|low energy|burned out|burnt out)\b/i,
  /^(?:but\s+)?i(?:\s+do\s+not|\s+don't)?\s+want to make (?:the )?(?:wrong move|a mistake)\b/i,
  /^(?:but\s+)?i(?:\s+do\s+not|\s+don't)?\s+need clarity\b/i,
  /^(?:but\s+)?i need clarity\b/i,
  /\bout of panic\b/i,
];

const ACTION_PATTERNS = [
  /\b(?:send|follow up|call|contact|fix|reply|book|prepare|ask|pay|invoice|rest|review|submit|reach out)\b/i,
  /\b(?:proposal|invoice|website|landlord|rent|lead|client|meeting|contract|email)\b/i,
];

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

const stripOrdinalPrefix = (value: string) =>
  value
    .replace(/^\s*(?:\((?:[1-5])\)|[1-5][.:]|(?:one|two|three|four|five|first|second|third|fourth|fifth):)\s*/i, "")
    .trim();

const stripMetaLead = (value: string) =>
  value
    .replace(
      /^(?:the real options are|real options are|the options are|what should (?:i\s+)?actually do first(?:,?\s*what should come second,?\s*and?\s*what can wait)?|what should come second|what can wait|what should wait|which is the cleaner move|which is the clearer shape|best next move|clearest next move|decision)\s*[:,-]?\s*/i,
      ""
    )
    .replace(/^(?:and|but|so|also|then)\s+/i, "")
    .trim();

const stripConditionalLead = (value: string) =>
  value
    .replace(/^if\s+(?:i|we)\s+/i, "")
    .replace(/^(?:i|we)\s+(?:could|can|should|might|would)\s+/i, "")
    .replace(/^(?:i|we)\s+(?:need|want)\s+to\s+/i, "")
    .trim();

const stripTail = (value: string) =>
  value
    .replace(/\s*,?\s*(?:even though|although|though|despite)\s+.+$/i, "")
    .replace(/\s+\b(?:because|since|as)\b\s+.+$/i, "")
    .replace(/\s+\bbut\b\s+.+$/i, "")
    .replace(/\s+\bwhich\b.+$/i, "")
    .replace(/\s+\bthat\b.+$/i, "")
    .replace(/\s+\bso\b.+$/i, "")
    .replace(/\b(?:or|and|but)\s*$/i, "")
    .trim();

const looksLikeAction = (value: string) => ACTION_PATTERNS.some((pattern) => pattern.test(value));
const isMeta = (value: string) => META_PATTERNS.some((pattern) => pattern.test(value));
const isContextOnly = (value: string) => CONTEXT_ONLY_PATTERNS.some((pattern) => pattern.test(value));

const sanitizeItem = (value: string) => {
  const cleaned = stripTail(stripConditionalLead(stripMetaLead(stripOrdinalPrefix(value.replace(/[.?!]+$/g, "").replace(/\s+/g, " ").trim()))));
  if (!cleaned || isMeta(cleaned) || isContextOnly(cleaned) || !looksLikeAction(cleaned)) {
    return "";
  }

  return toSentenceCase(cleaned);
};

const salvageItem = (value: string) => {
  const cleaned = stripMetaLead(stripOrdinalPrefix(value.replace(/[.?!]+$/g, "").replace(/\s+/g, " ").trim()))
    .replace(/\b(?:or|and|but)\s*$/i, "")
    .trim();

  if (!cleaned || isMeta(cleaned) || isContextOnly(cleaned) || !looksLikeAction(cleaned)) {
    return "";
  }

  return toSentenceCase(cleaned);
};

const sanitizeContextNote = (value: string) => {
  const cleaned = stripTail(stripMetaLead(stripOrdinalPrefix(value.replace(/[.?!]+$/g, "").replace(/\s+/g, " ").trim())));
  if (!cleaned || isMeta(cleaned)) {
    return "";
  }

  return toSentenceCase(cleaned);
};

const sanitizeWhyFirst = (value: string) => {
  const cleaned = stripMetaLead(stripOrdinalPrefix(value.replace(/\s+/g, " ").trim())).replace(/[.]+$/g, "").trim();
  return cleaned ? `${cleaned}.` : "";
};

const trimStringArray = (value: unknown, maxItems: number) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, maxItems);
};

const isPayloadLike = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return Array.isArray(payload.considered_items) || Array.isArray(payload.decision_groups);
};

export const normalizeClarityV1Result = (value: unknown): ClarityV1Result | null => {
  if (!isPayloadLike(value)) {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const toUsableItem = (entry: string) => sanitizeItem(entry) || salvageItem(entry);
  const considered = dedupeStrings(
    trimStringArray(payload.considered_items, 8).map(toUsableItem).filter(Boolean)
  ).slice(0, 8);
  const contextNotes = dedupeStrings(
    trimStringArray(payload.context_notes, 5).map(sanitizeContextNote).filter(Boolean)
  ).slice(0, 5);
  const decisionType =
    payload.decision_type === "single_task" ||
    payload.decision_type === "option_choice" ||
    payload.decision_type === "multiple_decisions" ||
    payload.decision_type === "foggy_dump"
      ? payload.decision_type
      : undefined;
  const decisionGroups = Array.isArray(payload.decision_groups)
    ? payload.decision_groups
        .map((group, index) => {
          if (!group || typeof group !== "object") {
            return null;
          }

          const maybeGroup = group as Record<string, unknown>;
          const items = dedupeStrings(
            trimStringArray(maybeGroup.items, 4).map(toUsableItem).filter(Boolean)
          ).slice(0, 4);
          const relationship =
            maybeGroup.candidate_relationship === "alternatives" ? "alternatives" : "tasks";
          const rawLabel = typeof maybeGroup.label === "string" ? maybeGroup.label : "";
          const label = sanitizeContextNote(rawLabel) || `Decision ${index + 1}`;
          const id =
            typeof maybeGroup.id === "string" && maybeGroup.id.trim()
              ? maybeGroup.id.trim()
              : `decision-group-${index + 1}`;

          if (!items.length) {
            return null;
          }

          return {
            id,
            label,
            items,
            candidate_relationship: relationship,
          };
        })
        .filter(
          (
            group
          ): group is {
            id: string;
            label: string;
            items: string[];
            candidate_relationship: "tasks" | "alternatives";
          } => Boolean(group)
        )
    : [];
  const fullBoard = dedupeStrings([
    ...considered,
    ...decisionGroups.flatMap((group) => group.items),
  ]).slice(0, 8);

  if (!fullBoard.length) {
    return null;
  }

  return {
    considered_items: fullBoard,
    context_notes: contextNotes,
    ...(decisionType ? { decision_type: decisionType } : {}),
    ...(decisionGroups.length ? { decision_groups: decisionGroups } : {}),
  };
};
