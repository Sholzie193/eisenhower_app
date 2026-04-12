import type { ClarityV1Result } from "./schema";
import { dedupeCanonicalClarityTitles, normalizeClarityTaskTitle } from "../../utils/clarity-title-cleanup";

const META_PATTERNS = [
  /\bwhat should (?:i\s+)?actually do first\b/i,
  /\bwhat should come second\b/i,
  /\bwhat can wait\b/i,
  /\bwhat should wait\b/i,
  /\bthe real options are\b/i,
  /\breal options are\b/i,
  /\bthe options are\b/i,
  /\bclearest next move\b/i,
  /\bclearest next step\b/i,
  /\bbest next move\b/i,
  /\b(?:sort|sorting|rank|ranking)\s+(?:a\s+)?(?:full|crowded|messy)?\s*(?:decision\s+)?board\b/i,
  /\bwithout flattening the board\b/i,
  /\bwithout dropping meaningful work\b/i,
  /\bwithout dropping real work\b/i,
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
  /\b(?:send|follow up|call|contact|fix|reply|respond|answer|book|prepare|ask|pay|invoice|rest|review|submit|reach out|record|organi[sz]e|reorgani[sz]e|clean up|cleanup|clean|write|draft|build|update|edit|sort|handle|polish|revise|repair|rewrite|troubleshoot|package|confirm|reconcile|trim|archive|label)\b/i,
  /\b(?:proposal|template|invoice|payments?|expenses?|refunds?|subscriptions?|website|homepage|hero section|landlord|rent|lead|client|meeting|travel|agenda|contract|revision|reminder|booking|widget|link|quote|services?|email|portfolio|page|demo|video|notes|files?|assets?|signup|newsletter|receipts?|bookkeeping|slides?|crm|tags|approval|explainer|case study)\b/i,
];

const ACTION_SPLIT_PATTERN =
  /\s+\bor\b\s+(?=(?:reply|respond|answer|send|contact|call|message|follow up|fix|finish|complete|review|submit|reach out|email|prepare|ask|pay|invoice|record|organi[sz]e|reorgani[sz]e|clean up|cleanup|clean|write|draft|build|update|edit|sort|handle|polish|revise|repair|rewrite|troubleshoot|package|confirm|reconcile|trim|archive|label|client\s+revision|invoice\s+reminder|demo\s+video|portfolio\s+page|services?\s+page|booking\s+link|booking\s+widget|meeting\s+notes|meeting\s+prep|warm\s+leads?|messy\s+files?|newsletter\s+signup|travel\s+details|proposal\s+template|strategy\s+call|agenda|quote|homepage\s+copy|hero\s+section|project\s+assets?|slides?|receipts?|bookkeeping|crm\s+tags|explainer|approval|(?:us|american)\s+proposal|revised?\s+contract|contract\s+revision|outstanding\s+revision)\b)|,\s*(?:and\s+)?(?=(?:reply|respond|answer|send|contact|call|message|follow up|fix|finish|complete|review|submit|reach out|email|prepare|ask|pay|invoice|record|organi[sz]e|reorgani[sz]e|clean up|cleanup|clean|write|draft|build|update|edit|sort|handle|polish|revise|repair|rewrite|troubleshoot|package|confirm|reconcile|trim|archive|label|client\s+revision|invoice\s+reminder|demo\s+video|portfolio\s+page|services?\s+page|booking\s+link|booking\s+widget|meeting\s+notes|meeting\s+prep|warm\s+leads?|messy\s+files?|newsletter\s+signup|travel\s+details|proposal\s+template|strategy\s+call|agenda|quote|homepage\s+copy|hero\s+section|project\s+assets?|slides?|receipts?|bookkeeping|crm\s+tags|explainer|approval|(?:us|american)\s+proposal|revised?\s+contract|contract\s+revision|outstanding\s+revision)\b)|\s+\band\b\s+(?=(?:reply|respond|answer|send|contact|call|message|follow up|fix|finish|complete|review|submit|reach out|email|prepare|ask|pay|invoice|record|organi[sz]e|reorgani[sz]e|clean up|cleanup|clean|write|draft|build|update|edit|sort|handle|polish|revise|repair|rewrite|troubleshoot|package|confirm|reconcile|trim|archive|label|client\s+revision|invoice\s+reminder|demo\s+video|portfolio\s+page|services?\s+page|booking\s+link|booking\s+widget|meeting\s+notes|meeting\s+prep|warm\s+leads?|messy\s+files?|newsletter\s+signup|travel\s+details|proposal\s+template|strategy\s+call|agenda|quote|homepage\s+copy|hero\s+section|project\s+assets?|slides?|receipts?|bookkeeping|crm\s+tags|explainer|approval|(?:us|american)\s+proposal|revised?\s+contract|contract\s+revision|outstanding\s+revision)\b)/i;

const ACTION_SENTENCE_SPLIT_PATTERN =
  /(?<=[.?!])\s+(?=(?:(?:and|but|so|also|then)\s+)?(?:reply|respond|answer|send|contact|call|message|follow up|fix|finish|complete|review|submit|reach out|email|prepare|ask|pay|invoice|record|organi[sz]e|reorgani[sz]e|clean up|cleanup|clean|write|draft|build|update|edit|sort|handle|polish|revise|repair|rewrite|troubleshoot|package|confirm|reconcile|trim|archive|label|client\s+revision|invoice\s+reminder|demo\s+video|portfolio\s+page|services?\s+page|booking\s+link|booking\s+widget|meeting\s+notes|meeting\s+prep|warm\s+leads?|messy\s+files?|newsletter\s+signup|travel\s+details|proposal\s+template|strategy\s+call|agenda|quote|homepage\s+copy|hero\s+section|project\s+assets?|slides?|receipts?|bookkeeping|crm\s+tags|explainer|approval|(?:us|american)\s+proposal|revised?\s+contract|contract\s+revision|outstanding\s+revision))/i;

const DECISION_LEAD_PATTERN =
  /^(?:should|do)\s+i\s+|^(?:whether)\s+to\s+|^(?:if)\s+i\s+(?:should|could|can|need to)\s+|^(?:i(?:['’]m| am)\s+)?(?:still\s+)?(?:trying to\s+)?decid(?:e|ing)\s+whether\s+to\s+|^i\s+need\s+to\s+decide\s+whether\s+to\s+/i;

const LIST_LEAD_PATTERN =
  /^(?:here(?:['’]s| is)|these are)\s+|^(?:i|we)\s+(?:need|have)\s+to\s+do\s+(?:one|two|three|four|five|several|a\s+few|\d+)?\s*things:\s*|^(?:i|we)\s+(?:need|have)\s+to\s+handle\s+(?:one|two|three|four|five|several|a\s+few|\d+)?\s*things:\s*|^(?:one|two|three|four|five|\d+)\s+things:\s*|^things:\s*/i;

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
      /^(?:(?:help me|i need help)\s+(?:sort|sorting|rank|ranking)\b[^:]*:|the real options are|real options are|the options are|what should (?:i\s+)?actually do first(?:,?\s*what should come second,?\s*and?\s*what can wait)?|what should come second|what can wait|what should wait|which is the cleaner move|which is the clearer shape|best next move|clearest next move|clearest next step|decision)\s*[:,-]?\s*/i,
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

const stripDecisionLead = (value: string) => value.replace(DECISION_LEAD_PATTERN, "").trim();
const stripListLead = (value: string) => value.replace(LIST_LEAD_PATTERN, "").trim();
const trimLeadingConnector = (value: string) => value.replace(/^(?:and|but|so|also|then)\s+/i, "").trim();
const protectCompoundActionPairs = (value: string) =>
  value
    .replace(/\breview\s+and\s+approve\b/gi, "review & approve")
    .replace(/\bback\s+up\s+and\s+(organi[sz]e|reorgani[sz]e)\b/gi, "back up & $1")
    .replace(/\barchive\s+and\s+label\b/gi, "archive & label");
const restoreCompoundActionPairs = (value: string) => value.replace(/\s*&\s*/g, " and ");

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
  const cleaned = stripTail(
    stripDecisionLead(
      stripListLead(
        stripConditionalLead(stripMetaLead(stripOrdinalPrefix(value.replace(/[.,;:?!]+$/g, "").replace(/\s+/g, " ").trim())))
      )
    )
  );
  if (!cleaned || isMeta(cleaned) || isContextOnly(cleaned) || !looksLikeAction(cleaned)) {
    return "";
  }

  return toSentenceCase(cleaned);
};

const salvageItem = (value: string) => {
  const cleaned = stripDecisionLead(
    stripListLead(
      stripMetaLead(stripOrdinalPrefix(value.replace(/[.,;:?!]+$/g, "").replace(/\s+/g, " ").trim()))
    )
  )
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

const splitCombinedDecisionItem = (value: string) => {
  const normalized = value.replace(/[.,;:?!]+$/g, "").replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const stripped = stripDecisionLead(stripListLead(stripMetaLead(stripOrdinalPrefix(normalized))));
  if (!stripped) {
    return [];
  }

  const slashChunks = stripped
    .split(/\s*(?:\/|\|)\s*/)
    .map((entry) => trimLeadingConnector(entry.trim()))
    .filter(Boolean);
  const sentenceChunks = (slashChunks.length > 1 ? slashChunks : [stripped]).flatMap((entry) =>
    entry
      .replace(/review and approve/gi, "review & approve")
      .split(ACTION_SENTENCE_SPLIT_PATTERN)
      .map((chunk) => trimLeadingConnector(chunk.trim()))
      .filter(Boolean)
  );
  const splitChunks = sentenceChunks.flatMap((entry) =>
    ACTION_SPLIT_PATTERN.test(protectCompoundActionPairs(entry))
      ? protectCompoundActionPairs(entry).split(ACTION_SPLIT_PATTERN).map(restoreCompoundActionPairs)
      : [entry]
  );

  if (splitChunks.length <= 1) {
    if (slashChunks.length > 1) {
      return slashChunks;
    }

    return [];
  }

  return splitChunks
    .map((entry) => entry.trim())
    .map(trimLeadingConnector)
    .filter(Boolean);
};

const toUsableItems = (entry: string) => {
  const splitItems = splitCombinedDecisionItem(entry)
    .map((candidate) => normalizeClarityTaskTitle(candidate) || sanitizeItem(candidate) || salvageItem(candidate))
    .filter(Boolean);

  if (splitItems.length > 1) {
    return splitItems;
  }

  const direct = normalizeClarityTaskTitle(entry) || sanitizeItem(entry) || salvageItem(entry);
  return direct ? [direct] : [];
};

export const normalizeClarityV1Result = (value: unknown): ClarityV1Result | null => {
  if (!isPayloadLike(value)) {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const considered = dedupeCanonicalClarityTitles(
    trimStringArray(payload.considered_items, MAX_CONSIDERED_ITEMS).flatMap(toUsableItems)
  ).slice(0, MAX_CONSIDERED_ITEMS);
  const contextNotes = dedupeStrings(
    trimStringArray(payload.context_notes, MAX_CONTEXT_NOTES).map(sanitizeContextNote).filter(Boolean)
  ).slice(0, MAX_CONTEXT_NOTES);
  const decisionType =
    payload.decision_type === "single_task" ||
    payload.decision_type === "option_choice" ||
    payload.decision_type === "multiple_decisions" ||
    payload.decision_type === "foggy_dump"
      ? payload.decision_type
      : undefined;
  const decisionGroups = Array.isArray(payload.decision_groups)
    ? payload.decision_groups
        .slice(0, MAX_DECISION_GROUPS)
        .map((group, index) => {
          if (!group || typeof group !== "object") {
            return null;
          }

          const maybeGroup = group as Record<string, unknown>;
          const items = dedupeCanonicalClarityTitles(
            trimStringArray(maybeGroup.items, MAX_GROUP_ITEMS).flatMap(toUsableItems)
          ).slice(0, MAX_GROUP_ITEMS);
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
  const fullBoard = dedupeCanonicalClarityTitles([
    ...considered,
    ...decisionGroups.flatMap((group) => group.items),
  ]).slice(0, MAX_CONSIDERED_ITEMS);

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
const MAX_CONSIDERED_ITEMS = 10;
const MAX_CONTEXT_NOTES = 5;
const MAX_GROUP_ITEMS = 8;
const MAX_DECISION_GROUPS = 8;
