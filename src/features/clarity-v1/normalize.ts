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
  return Array.isArray(payload.considered_items) || typeof payload.best_next_move === "string";
};

export const normalizeClarityV1Result = (value: unknown): ClarityV1Result | null => {
  if (!isPayloadLike(value)) {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const toUsableItem = (entry: string) => sanitizeItem(entry) || salvageItem(entry);
  const bestNextMove = toUsableItem(typeof payload.best_next_move === "string" ? payload.best_next_move : "");
  const considered = dedupeStrings(
    trimStringArray(payload.considered_items, 5).map(toUsableItem).filter(Boolean)
  ).slice(0, 5);
  const explicitStill = dedupeStrings(
    trimStringArray(payload.still_in_play, 3)
      .map(toUsableItem)
      .filter((item) => item && item.toLowerCase() !== bestNextMove.toLowerCase())
  ).slice(0, 3);
  const explicitWait = dedupeStrings(
    trimStringArray(payload.what_can_wait, 3)
      .map(toUsableItem)
      .filter(
        (item) =>
          item &&
          item.toLowerCase() !== bestNextMove.toLowerCase() &&
          !explicitStill.some((entry) => entry.toLowerCase() === item.toLowerCase())
      )
  ).slice(0, 3);
  const contextNotes = dedupeStrings(
    trimStringArray(payload.context_notes, 5).map(sanitizeContextNote).filter(Boolean)
  ).slice(0, 5);
  const fullBoard = dedupeStrings([bestNextMove, ...considered, ...explicitStill, ...explicitWait].filter(Boolean)).slice(0, 5);
  const nextMove = bestNextMove || fullBoard[0] || "";

  if (!nextMove || !fullBoard.length) {
    return null;
  }

  const remaining = fullBoard.filter((item) => item.toLowerCase() !== nextMove.toLowerCase());
  const stillInPlay = dedupeStrings([...explicitStill, ...remaining.filter((item) => !explicitWait.some((entry) => entry.toLowerCase() === item.toLowerCase()))]).slice(0, 3);
  const whatCanWait = dedupeStrings([...explicitWait, ...remaining.filter((item) => !stillInPlay.some((entry) => entry.toLowerCase() === item.toLowerCase())).slice(0, 3)]).slice(0, 3);
  const whyFirst = sanitizeWhyFirst(typeof payload.why_first === "string" ? payload.why_first : "");

  return {
    considered_items: fullBoard,
    best_next_move: nextMove,
    why_first: whyFirst || "This has the clearest mix of pressure, payoff, and fit right now.",
    still_in_play: stillInPlay,
    what_can_wait: whatCanWait,
    context_notes: contextNotes,
  };
};
