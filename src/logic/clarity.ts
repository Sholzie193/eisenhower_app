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
  DueWindow,
  ImpactArea,
  ImportanceSignal,
  TriageAnswers,
} from "../types/decision";

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
  /^also i(?:['’]m| am) deciding whether to\s+/i,
  /^also i(?:['’]m| am) trying to decide whether to\s+/i,
  /^i(?:['’]m| am) deciding whether to\s+/i,
  /^i(?:['’]m| am) trying to decide whether to\s+/i,
  /^trying to decide whether to\s+/i,
  /^need to decide whether to\s+/i,
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
  urgentToday: [/\btoday\b/i, /\btonight\b/i, /\basap\b/i, /\burgent\b/i, /\bright away\b/i, /\bimmediately\b/i, /\beod\b/i, /\bend of day\b/i],
  urgentTomorrow: [/\btomorrow\b/i, /\bfirst thing\b/i],
  urgentWeek: [/\bthis week\b/i, /\bfriday\b/i, /\bmonday\b/i, /\btuesday\b/i, /\bwednesday\b/i, /\bthursday\b/i, /\bweekend\b/i],
  hardDeadline: [
    /\bdeadline\b/i,
    /\bdue\s+(?:today|tonight|tomorrow|this week|this weekend|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|later)\b/i,
    /\b(?:by|before)\s+(?:today|tonight|tomorrow|this week|this weekend|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday|eod|end of day|\d{1,2}(?::\d{2})?\s?(?:am|pm)?)\b/i,
  ],
  severeDelay: [/\blandlord\b/i, /\brent\b/i, /\bclient\b/i, /\bproposal\b/i, /\binvoice\b/i, /\bhealth\b/i, /\bdoctor\b/i, /\bpay\b/i],
  disruptiveDelay: [/\bwebsite\b/i, /\boutreach\b/i, /\badmin\b/i, /\bemail\b/i, /\bmeeting\b/i, /\bdocs?\b/i, /\bcall\b/i],
  relief: [/\binbox\b/i, /\badmin\b/i, /\bemail\b/i, /\blandlord\b/i, /\bcall\b/i, /\bdocs?\b/i, /\breply\b/i, /\bdecision\b/i, /\brest\b/i],
  longTerm: [/\bproposal\b/i, /\bwebsite\b/i, /\bhealth\b/i, /\bexercise\b/i, /\bstrategy\b/i, /\bgoal\b/i, /\bplan\b/i],
  easyToUndo: [/\bcall\b/i, /\bemail\b/i, /\bfollow up\b/i, /\bschedule\b/i, /\brest\b/i, /\bbook\b/i],
  mostlyNoise: [/\bscreenshots?\b/i, /\breorgani[sz]e\b/i, /\btidy\b/i, /\bdoomscroll\b/i, /\blater maybe\b/i],
};

const clamp = (value: number, min = 0, max = 4) => Math.max(min, Math.min(max, Number(value.toFixed(2))));

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

const computeCompositeScore = (
  triageResult: ClarityCandidate["triageResult"],
  delayCostScore: number,
  reliefScore: number,
  longTermScore: number,
  reversibilityScore: number
) => {
  const matrixScore = triageResult.urgencyScore * 0.6 + triageResult.importanceScore * 0.85;
  return Number(
    (matrixScore + delayCostScore * 0.72 + reliefScore * 0.76 + longTermScore * 0.62 + reversibilityScore * 0.28).toFixed(2)
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

const cleanCandidate = (value: string) => {
  const withoutBullets = value.replace(/^[\s\-*•\d.)]+/, "").trim();
  const withoutPrefixes = FILLER_PREFIXES.reduce(
    (currentValue, expression) => currentValue.replace(expression, ""),
    withoutBullets
  );

  return withoutPrefixes.replace(/[.?!]+$/g, "").replace(/\s+/g, " ").trim();
};

const toSentenceCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const buildCandidateTitle = (value: string) => {
  const cleaned = cleanCandidate(value);
  const withoutContext = cleaned.replace(/\s+(?:because|since|so that|so|as)\s+.+$/i, "").trim();
  const simplified = TITLE_PREFIXES.reduce(
    (currentValue, expression) => currentValue.replace(expression, ""),
    withoutContext
  ).trim();

  return toSentenceCase((simplified || withoutContext || cleaned).replace(/[.?!]+$/g, "").trim());
};

const splitDecisionSegments = (rawInput: string) =>
  rawInput
    .replace(/\s+/g, " ")
    .split(/(?<=[.?!])\s+|\s+(?=also\s+i(?:['’]m| am)\s+(?:trying to )?decid(?:e|ing))/i)
    .map((segment) => segment.trim())
    .filter(Boolean);

const inferCandidateRelationship = (
  sourceText: string,
  candidateTexts: string[]
): ClarityCandidateRelationship =>
  candidateTexts.length > 1 && (hasExplicitCompareScaffold(sourceText) || /\s+\bor\b\s+/i.test(sourceText))
    ? "alternatives"
    : "tasks";

const buildDecisionGroupLabel = (candidateTexts: string[]) => {
  const titles = candidateTexts.map(buildCandidateTitle);
  if (titles.length <= 1) {
    return titles[0] ?? "This decision";
  }

  if (titles.length === 2) {
    return `${titles[0]} or ${titles[1]}`;
  }

  return `${titles.slice(0, 2).join(", ")}, and ${titles[2]}`;
};

const detectDecisionGroups = (rawInput: string): ClarityDecisionGroup[] =>
  splitDecisionSegments(rawInput)
    .map((segment, index) => {
      const candidateTexts = extractCandidateTexts(segment);
      const relationship = inferCandidateRelationship(segment, candidateTexts);

      if (relationship !== "alternatives" || candidateTexts.length < 2 || candidateTexts.length > 4) {
        return null;
      }

      return {
        id: `decision-group-${index + 1}`,
        label: buildDecisionGroupLabel(candidateTexts),
        sourceText: segment.replace(/[.?!]+$/g, "").trim(),
        candidateTexts,
      };
    })
    .filter((group): group is ClarityDecisionGroup => Boolean(group));

const extractCandidateTexts = (rawInput: string) => {
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
    /client|proposal|landlord|doctor|rest/i.test(text)
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
  let score = hasAnyMatch(text, KEYWORDS.easyToUndo) ? 2.4 : 1.2;
  if (/proposal|website|major|rebuild/i.test(text)) {
    score -= 0.6;
  }

  return clamp(score);
};

const buildCalmingWhy = (candidate: Pick<ClarityCandidate, "triageResult" | "reliefScore">) => {
  const { triageResult, reliefScore } = candidate;

  if (triageResult.quadrant === "doNow") {
    return reliefScore >= 2.5
      ? "This carries real pressure and should noticeably lighten the mental load once it moves."
      : "This has the clearest combination of urgency and importance right now.";
  }

  if (triageResult.quadrant === "schedule") {
    return "This matters, but it does not need to crowd the next few minutes.";
  }

  if (triageResult.quadrant === "delegate") {
    return "This feels loud, but it does not need your full attention first.";
  }

  return "This can stay lighter for now without creating much downside.";
};

const buildCandidate = (sourceText: string, index: number): ClarityCandidate => {
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
  const compositeScore = computeCompositeScore(
    triageResult,
    delayCostScore,
    reliefScore,
    longTermScore,
    reversibilityScore
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
    compositeScore,
    calmingWhy: "",
  };

  return {
    ...candidate,
    calmingWhy: buildCalmingWhy(candidate),
  };
};

const refreshCandidate = (
  candidate: ClarityCandidate,
  patch: {
    triageAnswers?: Partial<TriageAnswers>;
    delayCostScore?: number;
    reliefScore?: number;
    longTermScore?: number;
    reversibilityScore?: number;
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

  const nextCandidate: ClarityCandidate = {
    ...candidate,
    triageAnswers,
    triageResult,
    delayCostScore,
    reliefScore,
    longTermScore,
    reversibilityScore,
    compositeScore: computeCompositeScore(
      triageResult,
      delayCostScore,
      reliefScore,
      longTermScore,
      reversibilityScore
    ),
  };

  return {
    ...nextCandidate,
    calmingWhy: buildCalmingWhy(nextCandidate),
  };
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
  }
): ClarityAnalysis => {
  const sortedCandidates = sortCandidates(candidates);
  const topCandidates = sortedCandidates.slice(0, 2);
  const candidateRelationship = options?.candidateRelationship ?? "tasks";
  const decisionGroups = options?.decisionGroups ?? [];
  const activeDecisionGroupId = options?.activeDecisionGroupId;
  const scoreGap =
    topCandidates.length === 2 ? topCandidates[0].compositeScore - topCandidates[1].compositeScore : 9;
  const shouldAskQuestion =
    !selectedId &&
    mode !== "single" &&
    topCandidates.length === 2 &&
    scoreGap < 0.95 &&
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
    summary:
      decisionGroups.length > 1 && !activeDecisionGroupId
        ? `I see ${decisionGroups.length} separate decisions here. Pick the one you want to clear up first.`
        : decisionGroups.length > 1 && activeDecisionGroupId
          ? "This pass is keeping one decision in view so the options stay comparable."
          : getSummary(mode, sortedCandidates.length, narrowedFromCount),
    firstMove: sortedCandidates[0],
    candidates: sortedCandidates,
    waiting: sortedCandidates.slice(1),
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
  const previewDecisionGroup = !selectedDecisionGroup && decisionGroups.length > 1 ? decisionGroups[0] : undefined;
  const analysisDecisionGroup = selectedDecisionGroup ?? previewDecisionGroup;
  const analysisInput = analysisDecisionGroup ? analysisDecisionGroup.sourceText : rawInput;
  const extractedCandidates = analysisDecisionGroup
    ? analysisDecisionGroup.candidateTexts
    : extractCandidateTexts(analysisInput);
  const lowerInput = analysisInput.replace(/\s+/g, " ").trim().toLowerCase();
  const containsFogLanguage = FOG_PHRASES.some((phrase) => lowerInput.includes(phrase));
  const isParagraphLike = analysisInput.split(/\s+/).length > 18 || /[.?!]/.test(analysisInput);
  const narrowedCandidates = extractedCandidates.slice(0, 6);
  const builtCandidates = narrowedCandidates.map(buildCandidate);
  const sortedCandidates = sortCandidates(builtCandidates);
  const compareCandidates = sortedCandidates.slice(0, Math.min(sortedCandidates.length, 4));
  const candidateRelationship = analysisDecisionGroup
    ? "alternatives"
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
      activeDecisionGroupId: selectedDecisionGroup?.id,
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
    }
  );
};
