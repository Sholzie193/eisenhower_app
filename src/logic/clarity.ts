import { IMPACT_AREA_LABELS } from "../constants/quadrants";
import { evaluateTriage } from "./triage";
import type {
  ClarityAnalysis,
  ClarityCandidate,
  ClarityCandidateRelationship,
  ClarityDecisionGroup,
  ClarityMode,
  ClarityQuestion,
  ClarityQuestionKind,
  DecisionGate,
  DecisionShape,
  DueWindow,
  ImpactArea,
  ImportanceSignal,
  TriageAnswers,
} from "../types/decision";

type ContextSignalKind =
  | "lowEnergy"
  | "deadlinePressure"
  | "moneySpeed"
  | "higherValue"
  | "socialPressure";

interface ContextSignal {
  kind: ContextSignalKind;
  label: string;
}

interface ReasonFactor {
  tag: string;
  weight: number;
  explanation: string;
}

const FOG_PHRASES = [
  "don't know",
  "dont know",
  "not sure",
  "too many things",
  "overwhelmed",
  "brain dump",
  "foggy",
  "decide whether",
  "should i",
  "whether to",
];

const FILLER_PREFIXES = [
  /^do i\s+/i,
  /^also i(?:['’]m| am) (?:also\s+)?(?:still )?deciding whether (?:to|i should)\s+/i,
  /^also i(?:['’]m| am) (?:also\s+)?(?:still )?trying to decide whether (?:to|i should)\s+/i,
  /^i(?:['’]m| am) (?:also\s+)?(?:still )?deciding whether (?:to|i should)\s+/i,
  /^i(?:['’]m| am) (?:also\s+)?(?:still )?trying to decide whether (?:to|i should)\s+/i,
  /^(?:still )?trying to decide whether (?:to|i should)\s+/i,
  /^need to (?:still )?decide whether (?:to|i should)\s+/i,
  /^decide whether to\s+/i,
  /^deciding whether to\s+/i,
  /^i don't know whether to\s+/i,
  /^i dont know whether to\s+/i,
  /^whether to\s+/i,
  /^i need to\s+/i,
  /^need to\s+/i,
  /^i should\s+/i,
  /^should i\s+/i,
  /^also\s+/i,
  /^and\s+/i,
  /^or\s+/i,
];

const TITLE_PREFIXES = [/^focus on getting\s+/i, /^focus on\s+/i, /^getting\s+/i, /^do\s+/i];
const OPTION_INTRO_PREFIXES = [
  /^do i\s+/i,
  /^should i\s+/i,
  /^whether to\s+/i,
  /^decide whether to\s+/i,
  /^deciding whether to\s+/i,
  /^(?:still )?trying to decide whether (?:to|i should)\s+/i,
  /^need to (?:still )?decide whether (?:to|i should)\s+/i,
  /^i(?:['’]m| am) (?:also\s+)?(?:still )?deciding whether (?:to|i should)\s+/i,
  /^i(?:['’]m| am) (?:also\s+)?(?:still )?trying to decide whether (?:to|i should)\s+/i,
];
const CONTEXT_PATTERNS: Array<{ kind: ContextSignalKind; label: string; expression: RegExp }> = [
  {
    kind: "lowEnergy",
    label: "Energy feels low right now.",
    expression: /\b(?:hungry|hunger|tired|tiredness|exhausted|drained|fatigued|low energy|burned out|burnt out)\b/i,
  },
  {
    kind: "deadlinePressure",
    label: "There is real time pressure around this.",
    expression:
      /\b(?:deadline|due|today|tonight|tomorrow|urgent|asap|immediately|eod|end of day|this week|before\s+\d|by\s+\d)\b/i,
  },
  {
    kind: "moneySpeed",
    label: "Cash timing seems to matter here.",
    expression:
      /\b(?:money faster|get paid faster|paid faster|receive money faster|receive money from (?:them|this) faster|cash faster|pay faster|sooner)\b/i,
  },
  {
    kind: "higherValue",
    label: "One path appears to have higher upside.",
    expression: /\b(?:pay more|higher paying|higher value|more value|long term)\b/i,
  },
  {
    kind: "socialPressure",
    label: "There may be relationship or work consequences here.",
    expression: /\b(?:client|landlord|boss|team|partner|friend|family|reputation)\b/i,
  },
];

const AREA_KEYWORDS: Record<ImpactArea, RegExp[]> = {
  money: [/\bbill\b/i, /\binvoice\b/i, /\bbudget\b/i, /\bpayment\b/i, /\bcash\b/i, /\bmoney\b/i, /\brent\b/i],
  health: [/\bdoctor\b/i, /\bhealth\b/i, /\bsleep\b/i, /\brest\b/i, /\btherapy\b/i, /\bworkout\b/i, /\bexercise\b/i],
  safety: [/\bsafety\b/i, /\brepair\b/i, /\bleak\b/i, /\bdanger\b/i, /\bsecurity\b/i],
  work: [/\bclient\b/i, /\bproposal\b/i, /\bwebsite\b/i, /\boutreach\b/i, /\bemail\b/i, /\badmin\b/i, /\bmeeting\b/i, /\bwork\b/i],
  housing: [/\blandlord\b/i, /\blease\b/i, /\bapartment\b/i, /\bhome\b/i, /\bhousing\b/i, /\brent\b/i],
  longTermGoals: [/\bportfolio\b/i, /\bwebsite\b/i, /\bstrategy\b/i, /\bproposal\b/i, /\blearn\b/i, /\bplan\b/i, /\bgoal\b/i],
  relationships: [/\bfriend\b/i, /\bfamily\b/i, /\bpartner\b/i, /\bcall\b/i, /\bfollow up\b/i, /\bcheck in\b/i],
  reputation: [/\bclient\b/i, /\boutreach\b/i, /\bfollow up\b/i, /\bproposal\b/i, /\bpublic\b/i, /\bship\b/i],
};

const KEYWORDS = {
  urgentToday: [/\bnow\b/i, /\btoday\b/i, /\btonight\b/i, /\basap\b/i, /\burgent\b/i, /\bright away\b/i, /\bimmediately\b/i, /\beod\b/i, /\bend of day\b/i],
  urgentTomorrow: [/\btomorrow\b/i, /\bfirst thing\b/i],
  urgentWeek: [/\bthis week\b/i, /\bfriday\b/i, /\bmonday\b/i, /\btuesday\b/i, /\bwednesday\b/i, /\bthursday\b/i, /\bweekend\b/i],
  hardDeadline: [
    /\bdeadline\b/i,
    /\bdue\s+(?:today|tonight|tomorrow|this week|this weekend|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|later)\b/i,
    /\b(?:by|before)\s+(?:today|tonight|tomorrow|this week|this weekend|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|eod|end of day|\d{1,2}(?::\d{2})?\s?(?:am|pm)?)\b/i,
  ],
  severeDelay: [/\blandlord\b/i, /\brent\b/i, /\binvoice\b/i, /\bhealth\b/i, /\bdoctor\b/i, /\bpayment\b/i],
  disruptiveDelay: [/\bclient\b/i, /\bproposal\b/i, /\bwebsite\b/i, /\boutreach\b/i, /\badmin\b/i, /\bemail\b/i, /\bmeeting\b/i, /\bdocs?\b/i, /\bcall\b/i],
  relief: [/\binbox\b/i, /\badmin\b/i, /\bemail\b/i, /\blandlord\b/i, /\bcall\b/i, /\bdocs?\b/i, /\breply\b/i, /\bdecision\b/i, /\brest\b/i],
  longTerm: [/\bproposal\b/i, /\bwebsite\b/i, /\bhealth\b/i, /\bexercise\b/i, /\bstrategy\b/i, /\bgoal\b/i, /\bplan\b/i],
  easyToUndo: [/\bcall\b/i, /\bemail\b/i, /\bsend\b/i, /\bfollow up\b/i, /\boutreach\b/i, /\bschedule\b/i, /\brest\b/i, /\bbook\b/i],
  mostlyNoise: [/\bscreenshots?\b/i, /\breorgani[sz]e\b/i, /\btidy\b/i, /\bdoomscroll\b/i, /\blater maybe\b/i],
};

const clamp = (value: number, min = 0, max = 4) => Math.max(min, Math.min(max, Number(value.toFixed(2))));
const DUE_WINDOW_PRIORITY: Record<DueWindow, number> = {
  today: 4,
  tomorrow: 3,
  thisWeek: 2,
  later: 1,
  noDeadline: 0,
};

const hasAnyMatch = (value: string, expressions: RegExp[]) => expressions.some((expression) => expression.test(value));

const dedupe = (values: string[]) => {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = value.toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const dedupeSignals = (signals: ContextSignal[]) => {
  const seen = new Set<string>();
  return signals.filter((signal) => {
    if (seen.has(signal.kind)) {
      return false;
    }

    seen.add(signal.kind);
    return true;
  });
};

const joinReasonFragments = (fragments: string[]) => {
  if (fragments.length === 1) {
    return fragments[0];
  }

  if (fragments.length === 2) {
    return `${fragments[0]} and ${fragments[1]}`;
  }

  return `${fragments.slice(0, -1).join(", ")}, and ${fragments.at(-1)}`;
};

const computeCompositeScore = (
  triageResult: ClarityCandidate["triageResult"],
  delayCostScore: number,
  reliefScore: number,
  longTermScore: number,
  reversibilityScore: number,
  executionEaseScore: number
) => {
  const matrixScore = triageResult.urgencyScore * 0.6 + triageResult.importanceScore * 0.85;
  return Number(
    (
      matrixScore +
      delayCostScore * 0.72 +
      reliefScore * 0.76 +
      longTermScore * 0.62 +
      reversibilityScore * 0.28 +
      executionEaseScore * 0.38
    ).toFixed(2)
  );
};

const increaseDelayImpact = (delayImpact: TriageAnswers["delayImpact"]) => {
  switch (delayImpact) {
    case "none":
      return "annoying" as const;
    case "annoying":
      return "disruptive" as const;
    case "disruptive":
      return "severe" as const;
    case "severe":
    default:
      return "severe" as const;
  }
};

const hasExplicitCompareScaffold = (value: string) =>
  /\b(decide between|which one|vs\.?|versus|whether to|should i)\b/i.test(value);

const stripOptionIntro = (value: string) =>
  OPTION_INTRO_PREFIXES.reduce((currentValue, expression) => currentValue.replace(expression, ""), value).trim();

const cleanCandidate = (value: string) => {
  const withoutBullets = value.replace(/^[\s\-*•\d.)]+/, "").trim();
  const withoutPrefixes = FILLER_PREFIXES.reduce(
    (currentValue, expression) => currentValue.replace(expression, ""),
    withoutBullets
  );

  return withoutPrefixes.replace(/[.?!]+$/g, "").replace(/\s+/g, " ").trim();
};

const toSentenceCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const removeWhyClause = (value: string) => value.replace(/\s+(?:because|since|so that|so|as)\s+.+$/i, "").trim();

const naturalizeOptionTitle = (value: string) => {
  let nextValue = value
    .replace(/\binstead\b/gi, "")
    .replace(/\s+for outreach\b/i, "")
    .replace(/^send (?:a )?cold email\b/i, "cold email")
    .replace(/^do cold email\b/i, "cold email")
    .replace(/^send (?:a )?cold call\b/i, "cold calling")
    .replace(/^do cold calling\b/i, "cold calling")
    .replace(/^cold calling for outreach\b/i, "cold calling")
    .replace(/^prioriti[sz]e\s+(american|us|dubai|uk|eu|local|international)\s+clients\b/i, "$1 clients")
    .replace(/^prioriti[sz]e\s+/i, "")
    .replace(/^focus on\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (/^(american|us|dubai|uk|eu|local|international)\s+clients\b/i.test(nextValue)) {
    return toSentenceCase(nextValue);
  }

  return toSentenceCase(nextValue);
};

const buildCandidateTitle = (value: string) => {
  const cleaned = cleanCandidate(value);
  const withoutContext = removeWhyClause(cleaned);
  const simplified = TITLE_PREFIXES.reduce(
    (currentValue, expression) => currentValue.replace(expression, ""),
    withoutContext
  ).trim();

  return naturalizeOptionTitle((simplified || withoutContext || cleaned).replace(/[.?!]+$/g, "").trim());
};

const extractContextSignals = (rawInput: string) =>
  dedupeSignals(
    CONTEXT_PATTERNS.filter(({ expression }) => expression.test(rawInput)).map(({ kind, label }) => ({
      kind,
      label,
    }))
  );

const inferSharedActionBase = (leftOption: string) => {
  const withoutContext = removeWhyClause(stripOptionIntro(leftOption));
  const withoutTimeAnchor = withoutContext
    .replace(/\s+\b(?:during|after|before|around|at|on|in)\b.+$/i, "")
    .replace(/\s+\b(?:now|later|today|tomorrow|tonight)\b.*$/i, "")
    .trim();

  return withoutTimeAnchor || withoutContext;
};

const inferInheritedTiming = (leftOption: string, rightOption: string) => {
  const normalizedRight = rightOption.toLowerCase();

  if (/^after\b/.test(normalizedRight)) {
    if (/\bduring (?:my\s+)?lunch(?: break)?\b/i.test(leftOption)) {
      return "after lunch";
    }

    return "later";
  }

  if (/^later\b/.test(normalizedRight)) {
    return "later";
  }

  if (/^tomorrow\b/.test(normalizedRight)) {
    return "tomorrow";
  }

  if (/^now\b/.test(normalizedRight)) {
    return "now";
  }

  return rightOption;
};

const normalizeInheritedOption = (leftOption: string, rightOption: string) => {
  const cleanedRight = cleanCandidate(rightOption)
    .replace(/^(?:(?:i can|can|i could|could|i should|should)\s+)?(?:do it|do this|it|this)\s+/i, "")
    .trim();

  if (!cleanedRight) {
    return cleanCandidate(leftOption);
  }

  if (/^(?:after|later|tomorrow|tonight|today|now|before|during)\b/i.test(cleanedRight)) {
    const baseAction = inferSharedActionBase(leftOption);
    const inheritedTiming = inferInheritedTiming(leftOption, cleanedRight);
    return [baseAction, inheritedTiming].filter(Boolean).join(" ").trim();
  }

  return cleanedRight;
};

const extractBinaryOptionTexts = (rawInput: string) => {
  const normalized = rawInput
    .replace(/[•·]/g, "\n")
    .replace(/\s+(?:vs\.?|versus)\s+/gi, " or ")
    .replace(/\s+/g, " ")
    .trim();

  if (/[,\n;]/.test(normalized)) {
    return null;
  }

  if (!(hasExplicitCompareScaffold(normalized) || /\s+\bor\b\s+/i.test(normalized))) {
    return null;
  }

  const parts = normalized.split(/\s+\bor\b\s+/i);
  if (parts.length !== 2) {
    return null;
  }

  const left = cleanCandidate(parts[0]);
  const right = normalizeInheritedOption(left, parts[1]);
  const options = dedupe([left, right]).filter((value) => value.length > 2);

  return options.length === 2 ? options : null;
};

const getContextAlignmentScore = (text: string, contextSignals: ContextSignal[]) => {
  let score = 0;

  contextSignals.forEach((signal) => {
    if (signal.kind === "lowEnergy") {
      if (/\b(after lunch|after|later|rest|break|tomorrow)\b/i.test(text)) {
        score += 0.95;
      }

      if (/\b(during lunch|during my lunch break|skip lunch|now|right away|immediately)\b/i.test(text)) {
        score -= 0.95;
      }
    }

    if (signal.kind === "deadlinePressure") {
      if (/\b(now|today|right away|immediately|before|during)\b/i.test(text)) {
        score += 0.85;
      }

      if (/\b(after|later|tomorrow)\b/i.test(text)) {
        score -= 0.65;
      }
    }

    if (
      signal.kind === "moneySpeed" &&
      /\b(faster|sooner|cash|receive money faster|receive money from (?:them|this) faster|get paid faster|pay faster)\b/i.test(text)
    ) {
      score += 1.05;
    }

    if (signal.kind === "higherValue" && /\b(pay more|higher paying|higher value|long term)\b/i.test(text)) {
      score += 0.7;
    }

    if (signal.kind === "socialPressure" && /\b(client|landlord|boss|team|partner)\b/i.test(text)) {
      score += 0.35;
    }
  });

  return clamp(score, -2, 2);
};

const splitDecisionSegments = (rawInput: string) =>
  rawInput
    .replace(/\s+/g, " ")
    .split(
      /(?<=[.?!])\s+|(?:,\s*|\s+)(?=(?:(?:also|and|plus)\s+)?(?:should i|do i|i(?:['’]m| am)\s+(?:also\s+)?(?:still\s+)?(?:trying to\s+)?decid(?:e|ing)|need to\s+(?:still\s+)?decide whether))/i
    )
    .map((segment) => segment.trim())
    .filter(Boolean);

const looksLikeDecisionLead = (value: string) =>
  /^(?:also\s+)?(?:should i|do i|whether to|i(?:['’]m| am)\s+(?:also\s+)?(?:still\s+)?(?:trying to\s+)?decid(?:e|ing)|need to\s+(?:still\s+)?decide whether)/i.test(
    value.trim()
  );

const inferCandidateRelationship = (
  sourceText: string,
  candidateTexts: string[]
): ClarityCandidateRelationship =>
  candidateTexts.length > 1 && (hasExplicitCompareScaffold(sourceText) || /\s+\bor\b\s+/i.test(sourceText))
    ? "alternatives"
    : "tasks";

const isShortNounLikeOption = (value: string) =>
  !/^(send|call|email|fix|rest|book|schedule|wait|move|take|protect|keep|follow up|reply|start)\b/i.test(
    value
  ) && value.split(/\s+/).length <= 4;

const getOptionJoiner = (titles: string[]) =>
  titles.length === 2 && titles.every((title) => isShortNounLikeOption(title)) ? "vs" : "or";

const buildTradeoffHint = (sourceText: string, candidateTexts: string[]) => {
  const normalized = sourceText.toLowerCase();
  const titles = candidateTexts.map(buildCandidateTitle);

  if (
    /pay more|higher paying|higher value/i.test(normalized) &&
    /receive money faster|receive money from (?:them|this) faster|get paid faster|paid faster|money faster|cash faster|pay faster/i.test(
      normalized
    )
  ) {
    return "Higher pay vs faster payment.";
  }

  if (
    /during (?:my\s+)?lunch(?: break)?/i.test(normalized) &&
    /\bafter\b/i.test(normalized) &&
    /hungry|tired|low energy/i.test(normalized)
  ) {
    return "Sending sooner vs protecting your energy.";
  }

  if (/\bnow\b/i.test(normalized) && /\b(?:later|after|tomorrow)\b/i.test(normalized)) {
    return "Act sooner vs wait a bit.";
  }

  if (/\bprioriti[sz]e\b/i.test(normalized) && /\bkeep it broad\b/i.test(normalized)) {
    return "Focused niche vs broader reach.";
  }

  if (titles.length === 2 && /\bclients\b/i.test(titles[0]) && /\bclients\b/i.test(titles[1])) {
    return `${titles[0]} vs ${titles[1]}.`;
  }

  return undefined;
};

const buildDecisionGroupLabel = (candidateTexts: string[], sourceText: string) => {
  const titles = candidateTexts.map(buildCandidateTitle);
  if (titles.length <= 1) {
    return titles[0] ?? "This decision";
  }

  if (titles.length === 2) {
    return `${titles[0]} ${getOptionJoiner(titles)} ${titles[1]}`;
  }

  const tradeoffHint = buildTradeoffHint(sourceText, candidateTexts);
  if (tradeoffHint && / vs /i.test(tradeoffHint)) {
    return tradeoffHint.replace(/\.$/, "");
  }

  return `${titles.slice(0, 2).join(", ")}, and ${titles[2]}`;
};

const detectDecisionGroups = (rawInput: string): ClarityDecisionGroup[] =>
  splitDecisionSegments(rawInput)
    .map((segment, index) => {
      const candidateTexts = extractCandidateTexts(segment);
      const relationship = inferCandidateRelationship(segment, candidateTexts);

      const isDecisionSegment = relationship === "alternatives" || looksLikeDecisionLead(segment);

      if (!isDecisionSegment || candidateTexts.length < 1 || candidateTexts.length > 4) {
        return null;
      }

      return {
        id: `decision-group-${index + 1}`,
        label: buildDecisionGroupLabel(candidateTexts, segment),
        sourceText: segment.replace(/[.?!]+$/g, "").trim(),
        candidateTexts,
        candidateRelationship: relationship,
        ...(buildTradeoffHint(segment, candidateTexts)
          ? { tradeoffHint: buildTradeoffHint(segment, candidateTexts) }
          : {}),
      };
    })
    .filter((group): group is ClarityDecisionGroup => Boolean(group));

const scoreDecisionGroup = (group: ClarityDecisionGroup) => {
  const contextSignals = extractContextSignals(group.sourceText);
  const candidates = group.candidateTexts.map((candidateText, index) =>
    buildCandidate(candidateText, index, contextSignals)
  );
  const sortedCandidates = sortCandidates(candidates);
  const highestDelay = Math.max(...sortedCandidates.map((candidate) => candidate.delayCostScore));
  const hasDeadline = sortedCandidates.some((candidate) => candidate.triageAnswers.hasDeadline) ? 0.85 : 0;
  const hardToUndoWeight = Math.max(...sortedCandidates.map((candidate) => 4 - candidate.reversibilityScore)) * 0.35;

  return (sortedCandidates[0]?.compositeScore ?? 0) + highestDelay * 0.7 + hasDeadline + hardToUndoWeight;
};

const pickPrimaryDecisionGroup = (decisionGroups: ClarityDecisionGroup[]) =>
  [...decisionGroups].sort((left, right) => scoreDecisionGroup(right) - scoreDecisionGroup(left))[0];

const extractCandidateTexts = (rawInput: string) => {
  const binaryOptions = extractBinaryOptionTexts(rawInput);
  if (binaryOptions) {
    return binaryOptions;
  }

  const normalized = rawInput
    .replace(/[•·]/g, "\n")
    .replace(/\s+(?:vs\.?|versus)\s+/gi, ", ")
    .replace(/\s+/g, " ")
    .trim();

  const delimiterSplit = normalized
    .split(/[\n,;]+/)
    .map(cleanCandidate)
    .filter((value) => value.length > 2);

  if (delimiterSplit.length > 1) {
    return dedupe(delimiterSplit);
  }

  if (hasExplicitCompareScaffold(normalized) || /\s+\bor\b\s+/i.test(normalized)) {
    const compareSplit = normalized
      .split(/\s+\bor\b\s+/i)
      .map(cleanCandidate)
      .filter((value) => value.length > 2);

    if (compareSplit.length > 1) {
      return dedupe(compareSplit);
    }
  }

  const candidates = dedupe(
    normalized
      .split(/[\n,;]+/)
      .map(cleanCandidate)
      .filter((value) => value.length > 2)
  );

  return candidates.length ? candidates : [cleanCandidate(normalized)];
};

const getDueWindow = (text: string): { hasDeadline: boolean; dueWindow: DueWindow } => {
  if (hasAnyMatch(text, KEYWORDS.urgentToday)) {
    return { hasDeadline: true, dueWindow: "today" };
  }

  if (hasAnyMatch(text, KEYWORDS.urgentTomorrow)) {
    return { hasDeadline: true, dueWindow: "tomorrow" };
  }

  if (hasAnyMatch(text, KEYWORDS.urgentWeek)) {
    return { hasDeadline: true, dueWindow: "thisWeek" };
  }

  if (hasAnyMatch(text, KEYWORDS.hardDeadline)) {
    return { hasDeadline: true, dueWindow: "later" };
  }

  return { hasDeadline: false, dueWindow: "noDeadline" };
};

const inferImpactAreas = (text: string) =>
  (Object.keys(AREA_KEYWORDS) as ImpactArea[]).filter((area) => hasAnyMatch(text, AREA_KEYWORDS[area]));

const inferImportanceSignal = (text: string, impactAreas: ImpactArea[]): ImportanceSignal => {
  if (hasAnyMatch(text, KEYWORDS.mostlyNoise)) {
    return "mostlyNoise";
  }

  if (
    impactAreas.includes("health") ||
    impactAreas.includes("housing") ||
    impactAreas.includes("money") ||
    impactAreas.includes("longTermGoals") ||
    /client|proposal|landlord|doctor|rest|cold email|cold calling/i.test(text)
  ) {
    return "meaningful";
  }

  return impactAreas.length > 1 ? "meaningful" : "unclear";
};

const inferHandlingChoice = (text: string) => {
  if (/delegate|handoff|assign|ask .* to|send to/i.test(text)) {
    return "delegate" as const;
  }

  if (/automate|template|system|recurring|shortcut/i.test(text)) {
    return "automate" as const;
  }

  if (/ignore|skip|let it go/i.test(text) || hasAnyMatch(text, KEYWORDS.mostlyNoise)) {
    return "ignore" as const;
  }

  if (/trim|reduce|simplify/i.test(text)) {
    return "reduce" as const;
  }

  return "direct" as const;
};

const inferDelayImpact = (text: string, impactAreas: ImpactArea[]) => {
  if (hasAnyMatch(text, KEYWORDS.severeDelay) || impactAreas.includes("health") || impactAreas.includes("housing")) {
    return "severe" as const;
  }

  if (hasAnyMatch(text, KEYWORDS.disruptiveDelay) || impactAreas.includes("longTermGoals")) {
    return "disruptive" as const;
  }

  if (/reply|call|book|rest|admin|follow up/i.test(text)) {
    return "annoying" as const;
  }

  return "none" as const;
};

const getSuggestedCategory = (impactAreas: ImpactArea[]) => {
  const primaryArea = impactAreas[0];
  return primaryArea ? IMPACT_AREA_LABELS[primaryArea] : "";
};

const getMentalReliefScore = (text: string) => {
  let score = hasAnyMatch(text, KEYWORDS.relief) ? 2.2 : 1;

  if (/rest|sleep|break/i.test(text)) {
    score += 0.9;
  }

  if (/landlord|reply|admin|docs?/i.test(text)) {
    score += 0.5;
  }

  return clamp(score);
};

const getLongTermScore = (text: string, impactAreas: ImpactArea[]) => {
  let score = hasAnyMatch(text, KEYWORDS.longTerm) ? 2.4 : 0.8;
  if (impactAreas.includes("longTermGoals") || impactAreas.includes("health")) {
    score += 0.8;
  }

  return clamp(score);
};

const getReversibilityScore = (text: string) => {
  let score = hasAnyMatch(text, KEYWORDS.easyToUndo) ? 2.6 : 1.4;
  if (/\b(quit|resign|break up|move out|sign|submit final|fire|hire|sell|buy|commit)\b/i.test(text)) {
    score -= 1.1;
  }

  if (/\b(major rebuild|rebuild|irreversible|permanent)\b/i.test(text)) {
    score -= 0.8;
  }

  return clamp(score);
};

const getExecutionEaseScore = (text: string, contextSignals: ContextSignal[]) => {
  let score = 1.5;
  const lowEnergyContext = contextSignals.some((signal) => signal.kind === "lowEnergy");

  if (/\b(call|email|send|reply|book|rest|follow up|schedule|wait|after lunch|later|tomorrow)\b/i.test(text)) {
    score += 0.8;
  }

  if (/\b(cold calling|cold call)\b/i.test(text)) {
    score -= 0.7;
  }

  if (/\b(fix|finish|proposal|website|strategy|rebuild|prioriti[sz]e)\b/i.test(text)) {
    score -= 0.35;
  }

  if (text.split(/\s+/).length <= 4) {
    score += 0.25;
  }

  if (lowEnergyContext && /\b(after lunch|after|later|rest|break|tomorrow)\b/i.test(text)) {
    score += 0.65;
  }

  if (lowEnergyContext && /\b(during lunch|during my lunch break|skip lunch|now|right away|immediately)\b/i.test(text)) {
    score -= 0.75;
  }

  return clamp(score);
};

const getUpsideScore = (
  candidate: Pick<ClarityCandidate, "longTermScore" | "triageAnswers" | "sourceText">,
  contextSignals: ContextSignal[]
) => {
  let score = candidate.longTermScore * 0.7;

  if (candidate.triageAnswers.importanceSignal === "meaningful") {
    score += 1.1;
  } else if (candidate.triageAnswers.importanceSignal === "unclear") {
    score += 0.45;
  }

  if (
    candidate.triageAnswers.impactAreas.some((area) =>
      ["money", "work", "longTermGoals", "reputation", "relationships", "health"].includes(area)
    )
  ) {
    score += 0.55;
  }

  if (
    contextSignals.some((signal) => signal.kind === "higherValue") &&
    /\b(pay more|higher paying|higher value|more value|long term)\b/i.test(candidate.sourceText)
  ) {
    score += 0.7;
  }

  if (
    contextSignals.some((signal) => signal.kind === "moneySpeed") &&
    /\b(receive money faster|receive money from (?:them|this) faster|get paid faster|paid faster|money faster|cash faster|pay faster|faster)\b/i.test(
      candidate.sourceText
    )
  ) {
    score += 0.45;
  }

  return clamp(score);
};

const getDecisionGate = (
  candidates: Pick<ClarityCandidate, "delayCostScore" | "reversibilityScore">[],
  decisionShape: DecisionShape
): DecisionGate => {
  const highestDelay = Math.max(...candidates.map((candidate) => candidate.delayCostScore));
  const lowestReversibility = Math.min(...candidates.map((candidate) => candidate.reversibilityScore));

  if (decisionShape === "foggy_dump" || highestDelay >= 3.4 || lowestReversibility <= 1.1) {
    return "careful";
  }

  if (highestDelay <= 2.8 && lowestReversibility >= 2.1) {
    return "fast";
  }

  return "moderate";
};

const buildOptionReasonFactors = (
  candidate: Pick<
    ClarityCandidate,
    | "triageAnswers"
    | "delayCostScore"
    | "reversibilityScore"
    | "executionEaseScore"
    | "decisionFitScore"
    | "reliefScore"
    | "longTermScore"
    | "sourceText"
  >,
  runnerUp: Pick<
    ClarityCandidate,
    | "triageAnswers"
    | "delayCostScore"
    | "reversibilityScore"
    | "executionEaseScore"
    | "decisionFitScore"
    | "reliefScore"
    | "longTermScore"
    | "sourceText"
  >,
  contextSignals: ContextSignal[]
): ReasonFactor[] => {
  const lowEnergyContext = contextSignals.some((signal) => signal.kind === "lowEnergy");
  const deadlineContext = contextSignals.some((signal) => signal.kind === "deadlinePressure");
  const higherValueContext = contextSignals.some((signal) => signal.kind === "higherValue");
  const moneySpeedContext = contextSignals.some((signal) => signal.kind === "moneySpeed");
  const factors: ReasonFactor[] = [];
  const delayDiff = candidate.delayCostScore - runnerUp.delayCostScore;
  const easeDiff = candidate.executionEaseScore - runnerUp.executionEaseScore;
  const fitDiff = candidate.decisionFitScore - runnerUp.decisionFitScore;
  const reliefDiff = candidate.reliefScore - runnerUp.reliefScore;
  const reversibilityDiff = candidate.reversibilityScore - runnerUp.reversibilityScore;
  const upsideDiff = getUpsideScore(candidate, contextSignals) - getUpsideScore(runnerUp, contextSignals);
  const deadlineDiff =
    DUE_WINDOW_PRIORITY[candidate.triageAnswers.dueWindow] - DUE_WINDOW_PRIORITY[runnerUp.triageAnswers.dueWindow];

  if (deadlineDiff >= 1 || delayDiff >= 0.9 || (deadlineContext && candidate.delayCostScore >= 2.7)) {
    factors.push({
      tag: "delay matters",
      weight: 3.4 + Math.max(delayDiff, deadlineDiff * 0.45),
      explanation: "delay matters more on this side, so leaving it parked would cost more than waiting on the other option",
    });
  }

  if (
    lowEnergyContext &&
    /\b(after lunch|after|later|rest|break|tomorrow)\b/i.test(candidate.sourceText) &&
    candidate.delayCostScore <= runnerUp.delayCostScore + 0.35
  ) {
    factors.push({
      tag: "protects energy",
      weight: 3.3 + Math.max(fitDiff, easeDiff, 0),
      explanation: "it fits your current energy better, so you do not have to force the harder version of the choice",
    });
  }

  if (fitDiff >= 0.6) {
    factors.push({
      tag: "fits the moment",
      weight: 2.9 + fitDiff,
      explanation: "it lines up better with the constraint already in the situation, so it should feel easier to trust",
    });
  }

  if (easeDiff >= 0.55) {
    factors.push({
      tag: "low friction",
      weight: 2.8 + easeDiff,
      explanation: "it has less friction to start, which makes follow-through more likely",
    });
  }

  if (reversibilityDiff >= 0.55 || (candidate.reversibilityScore >= 2.4 && runnerUp.reversibilityScore <= 1.8)) {
    factors.push({
      tag: "reversible",
      weight: 2.75 + Math.max(reversibilityDiff, 0),
      explanation: "it is easier to adjust if the first read turns out to be slightly wrong",
    });
  }

  if (upsideDiff >= 0.65 || (higherValueContext && /pay more|higher paying|higher value|long term/i.test(candidate.sourceText))) {
    factors.push({
      tag: "meaningful upside",
      weight: 2.7 + Math.max(upsideDiff, 0),
      explanation: moneySpeedContext
        ? "it keeps the stronger upside in view, while the other option mostly wins on speed"
        : "it carries the stronger payoff from here, so the return on choosing it first looks better",
    });
  }

  if (
    moneySpeedContext &&
    /\b(receive money faster|receive money from (?:them|this) faster|get paid faster|paid faster|money faster|cash faster|pay faster|faster)\b/i.test(
      candidate.sourceText
    )
  ) {
    factors.push({
      tag: "faster payoff",
      weight: 2.65,
      explanation: "it gets the cash or response cycle moving sooner, which makes the near-term upside more concrete",
    });
  }

  if (reliefDiff >= 0.55) {
    factors.push({
      tag: "mental relief",
      weight: 2.55 + reliefDiff,
      explanation: "it should remove more mental drag once it moves, which makes it easier to stand behind as the first step",
    });
  }

  if (!factors.length) {
    factors.push(
      easeDiff >= -0.2
        ? {
            tag: "easier to execute",
            weight: 2.2 + Math.max(easeDiff, 0),
            explanation: "it looks a little easier to execute cleanly, which lowers the chance of getting stuck before you even start",
          }
        : {
            tag: "low downside",
            weight: 2.1,
            explanation: "the downside of choosing this first is low enough that you can keep the decision light without creating much risk",
          }
    );
  }

  return factors;
};

const buildStandaloneReasonFactors = (
  candidate: Pick<
    ClarityCandidate,
    | "triageResult"
    | "triageAnswers"
    | "reliefScore"
    | "reversibilityScore"
    | "delayCostScore"
    | "executionEaseScore"
    | "longTermScore"
    | "sourceText"
  >,
  options: {
    decisionShape: DecisionShape;
    decisionGate: DecisionGate;
    contextSignals: ContextSignal[];
  }
): ReasonFactor[] => {
  const lowEnergyContext = options.contextSignals.some((signal) => signal.kind === "lowEnergy");
  const factors: ReasonFactor[] = [];

  if (candidate.triageAnswers.hasDeadline || candidate.delayCostScore >= 2.7) {
    factors.push({
      tag: "time pressure",
      weight: 3.2 + candidate.delayCostScore,
      explanation: "delay would create enough pressure that leaving it untouched is likely to cost you more later",
    });
  }

  if (candidate.longTermScore >= 2.3 || candidate.triageAnswers.importanceSignal === "meaningful") {
    factors.push({
      tag: "meaningful upside",
      weight: 2.8 + candidate.longTermScore * 0.2,
      explanation: "it affects something that matters beyond the moment, so there is a real payoff to handling it well",
    });
  }

  if (candidate.executionEaseScore >= 2.4) {
    factors.push({
      tag: lowEnergyContext ? "fits your energy" : "easier to execute",
      weight: 2.6 + candidate.executionEaseScore * 0.15,
      explanation: lowEnergyContext
        ? "it fits your current capacity well enough that starting should feel lighter than it looks"
        : "it is clear enough to move without a lot of setup or hesitation",
    });
  }

  if (candidate.reversibilityScore >= 2.4) {
    factors.push({
      tag: "reversible",
      weight: 2.45 + candidate.reversibilityScore * 0.12,
      explanation: "you can start with a small step and still adjust later if new information shows up",
    });
  }

  if (candidate.reliefScore >= 2.4) {
    factors.push({
      tag: "mental relief",
      weight: 2.35 + candidate.reliefScore * 0.18,
      explanation: "moving it should take noticeable mental drag out of the background",
    });
  }

  if (!factors.length) {
    factors.push({
      tag: "low downside",
      weight: 2,
      explanation: "it stays relatively safe to keep this light while you focus on what matters more",
    });
  }

  return factors;
};

const pickReasonFactors = (factors: ReasonFactor[]) =>
  [...factors]
    .sort((left, right) => right.weight - left.weight)
    .filter(
      (factor, index, sortedFactors) =>
        sortedFactors.findIndex((candidateFactor) => candidateFactor.tag === factor.tag) === index
    )
    .slice(0, 3);

const buildCandidateReasoning = (
  candidate: Pick<
    ClarityCandidate,
    | "triageResult"
    | "triageAnswers"
    | "reliefScore"
    | "reversibilityScore"
    | "delayCostScore"
    | "executionEaseScore"
    | "decisionFitScore"
    | "longTermScore"
    | "sourceText"
  >,
  runnerUp: Pick<
    ClarityCandidate,
    | "triageResult"
    | "triageAnswers"
    | "reliefScore"
    | "reversibilityScore"
    | "delayCostScore"
    | "executionEaseScore"
    | "decisionFitScore"
    | "longTermScore"
    | "sourceText"
  > | null,
  options: {
    decisionShape: DecisionShape;
    decisionGate: DecisionGate;
    contextSignals: ContextSignal[];
  }
) => {
  const selectedFactors = pickReasonFactors(
    options.decisionShape === "option_choice" && runnerUp
      ? buildOptionReasonFactors(candidate, runnerUp, options.contextSignals)
      : buildStandaloneReasonFactors(candidate, options)
  );

  const explanation =
    options.decisionShape === "option_choice" && runnerUp
      ? `This ${candidate.triageResult.quadrant === "schedule" ? "edges ahead" : "wins"} because ${joinReasonFragments(
          selectedFactors.map((factor) => factor.explanation)
        )}.`
      : `This looks strongest because ${joinReasonFragments(selectedFactors.map((factor) => factor.explanation))}.`;

  return {
    calmingWhy: explanation,
    reasonTags: selectedFactors.map((factor) => factor.tag),
  };
};

const buildCandidate = (sourceText: string, index: number, contextSignals: ContextSignal[] = []): ClarityCandidate => {
  const normalizedText = sourceText.toLowerCase();
  const impactAreas = inferImpactAreas(normalizedText);
  const due = getDueWindow(normalizedText);
  const triageAnswers: TriageAnswers = {
    hasDeadline: due.hasDeadline,
    dueWindow: due.dueWindow,
    delayImpact: inferDelayImpact(normalizedText, impactAreas),
    impactAreas,
    importanceSignal: inferImportanceSignal(normalizedText, impactAreas),
    handlingChoice: inferHandlingChoice(normalizedText),
  };
  const triageResult = evaluateTriage(triageAnswers);
  const delayCostScore =
    triageAnswers.delayImpact === "severe"
      ? 3.7
      : triageAnswers.delayImpact === "disruptive"
        ? 2.7
        : triageAnswers.delayImpact === "annoying"
          ? 1.6
          : 0.6;
  const reliefScore = getMentalReliefScore(normalizedText);
  const longTermScore = getLongTermScore(normalizedText, impactAreas);
  const reversibilityScore = getReversibilityScore(normalizedText);
  const executionEaseScore = getExecutionEaseScore(normalizedText, contextSignals);
  const decisionFitScore = getContextAlignmentScore(normalizedText, contextSignals);
  const compositeScore = computeCompositeScore(
    triageResult,
    delayCostScore,
    reliefScore,
    longTermScore,
    reversibilityScore,
    executionEaseScore
  );

  const title = buildCandidateTitle(sourceText);

  const candidate: ClarityCandidate = {
    id: `candidate-${index + 1}`,
    title,
    sourceText: toSentenceCase(cleanCandidate(sourceText)),
    category: getSuggestedCategory(impactAreas),
    triageAnswers,
    triageResult,
    delayCostScore,
    longTermScore,
    reliefScore,
    reversibilityScore,
    executionEaseScore,
    decisionFitScore,
    compositeScore: Number((compositeScore + decisionFitScore).toFixed(2)),
    calmingWhy: "",
    reasonTags: [],
  };

  return candidate;
};

const refreshCandidate = (
  candidate: ClarityCandidate,
  patch: {
    triageAnswers?: Partial<TriageAnswers>;
    delayCostScore?: number;
    reliefScore?: number;
    longTermScore?: number;
    reversibilityScore?: number;
    decisionFitScore?: number;
  }
) => {
  const nextImpactAreas = patch.triageAnswers?.impactAreas ?? candidate.triageAnswers.impactAreas;
  const triageAnswers: TriageAnswers = {
    ...candidate.triageAnswers,
    ...patch.triageAnswers,
    impactAreas: nextImpactAreas,
  };
  const triageResult = evaluateTriage(triageAnswers);
  const delayCostScore = patch.delayCostScore ?? candidate.delayCostScore;
  const reliefScore = patch.reliefScore ?? candidate.reliefScore;
  const longTermScore = patch.longTermScore ?? candidate.longTermScore;
  const reversibilityScore = patch.reversibilityScore ?? candidate.reversibilityScore;
  const executionEaseScore = candidate.executionEaseScore;
  const decisionFitScore = patch.decisionFitScore ?? candidate.decisionFitScore;

  const nextCandidate: ClarityCandidate = {
    ...candidate,
    triageAnswers,
    triageResult,
    delayCostScore,
    reliefScore,
    longTermScore,
    reversibilityScore,
    executionEaseScore,
    decisionFitScore,
    compositeScore: Number(
      (
        computeCompositeScore(
          triageResult,
          delayCostScore,
          reliefScore,
          longTermScore,
          reversibilityScore,
          executionEaseScore
        ) +
        decisionFitScore
      ).toFixed(2)
    ),
  };

  return nextCandidate;
};

const sortCandidates = (candidates: ClarityCandidate[]) =>
  [...candidates].sort((left, right) => right.compositeScore - left.compositeScore);

const getQuestionKind = (topCandidates: ClarityCandidate[]): ClarityQuestionKind => {
  const [first, second] = topCandidates;

  if (first.triageAnswers.hasDeadline || second.triageAnswers.hasDeadline) {
    return "deadline";
  }

  if (Math.abs(first.reliefScore - second.reliefScore) <= 0.45) {
    return "relief";
  }

  if (Math.abs(first.longTermScore - second.longTermScore) <= 0.45) {
    return "longTerm";
  }

  return "downside";
};

const getQuestionPrompt = (kind: ClarityQuestionKind) => {
  switch (kind) {
    case "deadline":
      return "Which one has a real deadline first?";
    case "relief":
      return "Which one would create the most relief if handled?";
    case "longTerm":
      return "Which one matters most long term?";
    case "downside":
    default:
      return "Which one has the biggest downside if delayed?";
  }
};

const getDecisionShape = (
  mode: ClarityMode,
  candidateRelationship: ClarityCandidateRelationship,
  decisionGroups: ClarityDecisionGroup[],
  activeDecisionGroupId?: string
): DecisionShape => {
  if (decisionGroups.length > 1 && !activeDecisionGroupId) {
    return "multiple_decisions";
  }

  if (candidateRelationship === "alternatives" && mode !== "single") {
    return "option_choice";
  }

  if (mode === "fog") {
    return "foggy_dump";
  }

  return "single_action";
};

const buildDecisionLabel = (
  decisionShape: DecisionShape,
  candidateTexts: string[],
  activeDecisionGroup?: ClarityDecisionGroup
) => {
  if (decisionShape !== "option_choice" || candidateTexts.length < 2) {
    return undefined;
  }

  if (activeDecisionGroup?.label) {
    return activeDecisionGroup.label.includes("?") ? activeDecisionGroup.label : `${activeDecisionGroup.label}?`;
  }

  const titles = candidateTexts.map(buildCandidateTitle);
  const tradeoffHint = buildTradeoffHint(candidateTexts.join(" "), candidateTexts);

  if (titles.length === 2) {
    return tradeoffHint && / vs /i.test(tradeoffHint)
      ? `${tradeoffHint.replace(/\.$/, "")}?`
      : `${titles[0]} ${getOptionJoiner(titles)} ${titles[1]}?`;
  }

  return `Which is the cleaner move: ${titles.slice(0, 3).join(", ")}?`;
};

const getSummary = (mode: ClarityMode, candidateCount: number, narrowedFromCount?: number) => {
  if (mode === "single") {
    return "One thing came through clearly, so the app kept the answer direct.";
  }

  if (mode === "compare") {
    return "This looks like a real choice between a few options, so the app ranked the clearest move first.";
  }

  if (narrowedFromCount && narrowedFromCount > candidateCount) {
    return `The input looked crowded, so the app narrowed ${narrowedFromCount} possibilities down to the few that matter most right now.`;
  }

  return "The input looked a little foggy, so the app pulled out the likely options before making a calmer recommendation.";
};

const finalizeAnalysis = (
  rawInput: string,
  mode: ClarityMode,
  candidates: ClarityCandidate[],
  narrowedFromCount?: number,
  selectedId?: string,
  options?: {
    candidateRelationship?: ClarityCandidateRelationship;
    decisionGroups?: ClarityDecisionGroup[];
    activeDecisionGroupId?: string;
    contextSignals?: ContextSignal[];
    decisionLabelTexts?: string[];
  }
): ClarityAnalysis => {
  const sortedCandidates = sortCandidates(candidates);
  const candidateRelationship = options?.candidateRelationship ?? "tasks";
  const decisionGroups = options?.decisionGroups ?? [];
  const activeDecisionGroupId = options?.activeDecisionGroupId;
  const activeDecisionGroup = decisionGroups.find((group) => group.id === activeDecisionGroupId);
  const contextSignals = options?.contextSignals ?? [];
  const decisionShape = getDecisionShape(mode, candidateRelationship, decisionGroups, activeDecisionGroupId);
  const decisionGate = getDecisionGate(sortedCandidates, decisionShape);
  const enrichedCandidates = sortedCandidates.map((candidate, index) => {
    const runnerUp =
      decisionShape === "option_choice"
        ? sortedCandidates[index === 0 ? 1 : 0] ?? null
        : null;
    const reasoning = buildCandidateReasoning(candidate, runnerUp, {
      decisionShape,
      decisionGate,
      contextSignals,
    });

    return {
      ...candidate,
      calmingWhy: reasoning.calmingWhy,
      reasonTags: reasoning.reasonTags,
    };
  });
  const topCandidates = enrichedCandidates.slice(0, 2);
  const scoreGap =
    topCandidates.length === 2 ? topCandidates[0].compositeScore - topCandidates[1].compositeScore : 9;
  const shouldAskQuestion =
    !selectedId &&
    mode !== "single" &&
    topCandidates.length === 2 &&
    scoreGap < (decisionGate === "careful" ? 1.25 : 0.95) &&
    decisionGate !== "fast" &&
    !(decisionGroups.length > 1 && !activeDecisionGroupId);

  const question: ClarityQuestion | null = shouldAskQuestion
    ? {
        kind: getQuestionKind(topCandidates),
        prompt: getQuestionPrompt(getQuestionKind(topCandidates)),
        candidateIds: topCandidates.map((candidate) => candidate.id),
      }
    : null;

  return {
    rawInput,
    mode,
    decisionShape,
    decisionGate,
    decisionLabel: buildDecisionLabel(
      decisionShape,
      options?.decisionLabelTexts ?? candidates.map((candidate) => candidate.title),
      activeDecisionGroup
    ),
    contextKinds: contextSignals.map((signal) => signal.kind),
    contextHints: contextSignals.map((signal) => signal.label),
    summary:
      decisionGroups.length > 1 && activeDecisionGroupId
        ? `I found ${decisionGroups.length} separate choices here. This resolves the one with the clearest immediate weight first, and another decision remains for later.`
        : decisionShape === "option_choice"
          ? decisionGate === "fast"
            ? "This looks like a contained choice, so the app kept the answer light and direct."
            : "This looks like a real option choice, so the app weighed the options before recommending the cleaner move."
          : getSummary(mode, enrichedCandidates.length, narrowedFromCount),
    firstMove: enrichedCandidates[0],
    candidates: enrichedCandidates,
    waiting: enrichedCandidates.slice(1),
    question,
    candidateRelationship,
    decisionGroups,
    activeDecisionGroupId,
    narrowedFromCount,
  };
};

export const analyzeClarityInput = (rawInput: string, selectedDecisionGroupId?: string): ClarityAnalysis => {
  const normalizedInput = rawInput.replace(/\s+/g, " ").trim();
  const decisionGroups = detectDecisionGroups(normalizedInput);
  const selectedDecisionGroup = selectedDecisionGroupId
    ? decisionGroups.find((group) => group.id === selectedDecisionGroupId)
    : undefined;
  const autoPrimaryDecisionGroup =
    !selectedDecisionGroup && decisionGroups.length > 1 ? pickPrimaryDecisionGroup(decisionGroups) : undefined;
  const analysisDecisionGroup = selectedDecisionGroup ?? autoPrimaryDecisionGroup;
  const analysisInput = analysisDecisionGroup ? analysisDecisionGroup.sourceText : rawInput;
  const contextSignals = extractContextSignals(analysisInput);
  const extractedCandidates = analysisDecisionGroup
    ? analysisDecisionGroup.candidateTexts
    : extractCandidateTexts(analysisInput);
  const lowerInput = analysisInput.replace(/\s+/g, " ").trim().toLowerCase();
  const containsFogLanguage = FOG_PHRASES.some((phrase) => lowerInput.includes(phrase));
  const isParagraphLike = analysisInput.split(/\s+/).length > 18 || /[.?!]/.test(analysisInput);
  const narrowedCandidates = extractedCandidates.slice(0, 6);
  const builtCandidates = narrowedCandidates.map((candidateText, index) =>
    buildCandidate(candidateText, index, contextSignals)
  );
  const sortedCandidates = sortCandidates(builtCandidates);
  const compareCandidates = sortedCandidates.slice(0, Math.min(sortedCandidates.length, 4));
  const candidateRelationship = analysisDecisionGroup
    ? analysisDecisionGroup.candidateRelationship
    : inferCandidateRelationship(analysisInput, extractedCandidates);

  const mode: ClarityMode =
    extractedCandidates.length > 4
      ? "fog"
      : compareCandidates.length <= 1
        ? isParagraphLike || containsFogLanguage
          ? "fog"
          : "single"
        : "compare";

  return finalizeAnalysis(
    normalizedInput,
    mode,
    compareCandidates,
    extractedCandidates.length > compareCandidates.length ? extractedCandidates.length : undefined,
    undefined,
    {
      candidateRelationship,
      decisionGroups,
      activeDecisionGroupId: analysisDecisionGroup?.id,
      contextSignals,
      decisionLabelTexts: narrowedCandidates,
    }
  );
};

export const focusClarityDecisionGroup = (
  analysis: ClarityAnalysis,
  decisionGroupId: string
): ClarityAnalysis => analyzeClarityInput(analysis.rawInput, decisionGroupId);

export const answerClarityQuestion = (
  analysis: ClarityAnalysis,
  selectedCandidateId: string
): ClarityAnalysis => {
  if (!analysis.question) {
    return analysis;
  }

  const deadlineBaseline =
    analysis.candidates.find((candidate) => candidate.triageAnswers.hasDeadline)?.triageAnswers.dueWindow ??
    "thisWeek";

  const boostedCandidates = analysis.candidates.map((candidate) =>
    candidate.id === selectedCandidateId
      ? analysis.question?.kind === "deadline"
        ? refreshCandidate(candidate, {
            triageAnswers: {
              hasDeadline: true,
              dueWindow:
                candidate.triageAnswers.dueWindow === "noDeadline"
                  ? deadlineBaseline
                  : candidate.triageAnswers.dueWindow,
            },
            delayCostScore: clamp(candidate.delayCostScore + 0.75),
          })
        : analysis.question?.kind === "relief"
          ? refreshCandidate(candidate, {
              reliefScore: clamp(candidate.reliefScore + 1.2),
            })
          : analysis.question?.kind === "longTerm"
            ? refreshCandidate(candidate, {
                triageAnswers: {
                  importanceSignal:
                    candidate.triageAnswers.importanceSignal === "mostlyNoise" ? "unclear" : "meaningful",
                  impactAreas: candidate.triageAnswers.impactAreas.includes("longTermGoals")
                    ? candidate.triageAnswers.impactAreas
                    : [...candidate.triageAnswers.impactAreas, "longTermGoals"],
                },
                longTermScore: clamp(candidate.longTermScore + 1.2),
              })
            : refreshCandidate(candidate, {
                triageAnswers: {
                  delayImpact: increaseDelayImpact(candidate.triageAnswers.delayImpact),
                },
                delayCostScore: clamp(candidate.delayCostScore + 1.1),
              })
      : candidate
  );

  const contextSignals = analysis.contextKinds.map((kind, index) => ({
    kind: kind as ContextSignalKind,
    label: analysis.contextHints[index] ?? "",
  }));

  return finalizeAnalysis(
    analysis.rawInput,
    analysis.mode,
    boostedCandidates,
    analysis.narrowedFromCount,
    selectedCandidateId,
    {
      candidateRelationship: analysis.candidateRelationship,
      decisionGroups: analysis.decisionGroups,
      activeDecisionGroupId: analysis.activeDecisionGroupId,
      contextSignals,
    }
  );
};
