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
  /\bclearest next step\b/i,
  /\bwithout dropping meaningful work\b/i,
  /\bwithout dropping real work\b/i,
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
  /\b(?:call|email|send|fix|finish|rest|book|schedule|wait|reply|respond|answer|follow up|cold email|cold call|cold calling|clean up|cleanup|clean|prioriti[sz]e|focus on|keep|switch|choose|pay|invoice|ship|submit|review|reach out|outreach|delegate|automate|reduce|ignore|quit|resign|sign|buy|sell|start|stop|eat|prepare|ask|contact|record|organi[sz]e|reorgani[sz]e|write|draft|build|update|edit|sort|handle|polish|revise|rehearse|publish|post|back up|backup|approve|repair|rewrite|troubleshoot|package|confirm|reconcile|trim|archive|label)\b/i,
];

const AI_OPTION_NOUN_PATTERNS = [
  /\b(?:proposal|invoice|contract|email|website|rent|landlord|meeting|clients?|client|lead|timing|outreach|cold email|cold calling|call|rest|break|approval|slides?|receipts?|bookkeeping|hero section|homepage|case study|crm|tags|faq|link|widget|explainer|onboarding)\b/i,
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

const stripOrdinalListPrefix = (value: string) =>
  value
    .replace(/^\s*(?:\((?:[1-5])\)|[1-5][.:]|(?:one|two|three|four|five|first|second|third|fourth|fifth):)\s*/i, "")
    .trim();

const stripAiMetaLead = (value: string) =>
  value
    .replace(
      /^(?:(?:help me|i need help)\s+(?:sort|sorting|rank|ranking)\b[^:]*:|the real options are|real options are|the options are|actually handle first|actually do first|handle first|do first|what should (?:i\s+)?actually do first(?:,?\s*what should come second,?\s*and?\s*what can wait)?|what should come second|what can wait|what should wait|what to do (?:now|next|first)|which is the cleaner move|which is the clearer shape|this looks like the move|this looks like the clearer option|here(?:['’]?)s the cleaner option|here(?:['’]?)s the clearer shape|best next move|best first option|clearest next move|clearest next step|decision)\s*[:,-]?\s*/i,
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
