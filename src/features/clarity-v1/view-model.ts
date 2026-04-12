import { DEFAULT_TRIAGE_ANSWERS } from "../../logic/triageConfig";
import type {
  ClarityAnalysis,
  ClarityCandidate,
  Quadrant,
  TriageAnswers,
  TriageResult,
} from "../../types/decision";
import type { ClarityV1Result } from "./schema";

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

const getBucketQuadrant = (title: string, bucket: "best" | "still" | "wait"): Quadrant => {
  if (bucket === "wait") {
    return "eliminate";
  }

  if (bucket === "best") {
    return /\b(?:now|today|tonight|urgent|asap|immediately)\b/i.test(title) ? "doNow" : "schedule";
  }

  return "schedule";
};

const getCategory = (title: string) => {
  if (/\b(?:landlord|rent|lease|apartment|housing)\b/i.test(title)) {
    return "Housing";
  }

  if (/\b(?:invoice|payment|cash|money)\b/i.test(title)) {
    return "Money";
  }

  if (/\b(?:client|proposal|website|meeting|email|lead|outreach)\b/i.test(title)) {
    return "Work";
  }

  if (/\b(?:rest|sleep|doctor|health)\b/i.test(title)) {
    return "Health";
  }

  return "Clarity";
};

const createTriageResult = (title: string, bucket: "best" | "still" | "wait"): TriageResult => {
  const quadrant = getBucketQuadrant(title, bucket);

  if (quadrant === "doNow") {
    return {
      urgencyScore: 7.2,
      importanceScore: 6.2,
      quadrant,
      recommendation: "Move this first while the pressure is still real.",
      nextStep: "Start the smallest concrete part now so it stops sitting in your head.",
      explanation: "This is the clearest move to lead with right now.",
      urgencyReasons: [],
      importanceReasons: [],
    };
  }

  if (quadrant === "schedule") {
    return {
      urgencyScore: 4.4,
      importanceScore: 6,
      quadrant,
      recommendation: bucket === "best" ? "Handle this next with a deliberate slot." : "This still matters, just not first.",
      nextStep:
        bucket === "best"
          ? "Pick a short time to handle it deliberately so it stops floating."
          : "Keep it in view and let it follow after the first move settles.",
      explanation:
        bucket === "best"
          ? "This has the clearest mix of pressure, payoff, and fit right now."
          : "This still matters, but it can follow after the first move.",
      urgencyReasons: [],
      importanceReasons: [],
    };
  }

  return {
    urgencyScore: 2.1,
    importanceScore: 3,
    quadrant,
    recommendation: "This can stay out of the foreground for now.",
    nextStep: "Keep it noted, but do not let it lead the board right now.",
    explanation: "This carries less pressure than the items above.",
    urgencyReasons: [],
    importanceReasons: [],
  };
};

const createCandidate = (
  title: string,
  bucket: "best" | "still" | "wait",
  index: number,
  whyFirst = ""
): ClarityCandidate => {
  const triageAnswers: TriageAnswers = {
    ...DEFAULT_TRIAGE_ANSWERS,
  };
  const triageResult = createTriageResult(title, bucket);

  return {
    id: `clarity-v1-${index + 1}`,
    title,
    sourceText: title,
    category: getCategory(title),
    triageAnswers,
    triageResult,
    delayCostScore: bucket === "best" ? 2.8 : bucket === "still" ? 1.8 : 0.8,
    longTermScore: bucket === "wait" ? 1.2 : 2,
    reliefScore: bucket === "best" ? 2.4 : 1.6,
    reversibilityScore: 2.2,
    executionEaseScore: bucket === "best" ? 2.4 : 1.8,
    decisionFitScore: bucket === "best" ? 1.4 : 0.8,
    compositeScore: bucket === "best" ? 7.2 : bucket === "still" ? 5.1 : 3.1,
    calmingWhy: whyFirst || triageResult.explanation,
    reasonTags: bucket === "best" ? ["full board considered", "clearest next move"] : [],
  };
};

export const createClarityV1Failure = (
  rawInput: string,
  failureTitle = "I couldn't get a reliable read of this yet.",
  failureMessage = "Try again in a moment, or switch to the manual breakdown if you want a deterministic read."
): ClarityAnalysis => ({
  status: "failed",
  rawInput,
  source: "ai",
  mode: "fog",
  decisionShape: "foggy_dump",
  decisionGate: "careful",
  contextKinds: [],
  contextHints: [],
  summary: failureTitle,
  firstMove: null,
  candidates: [],
  activeItems: [],
  laterItems: [],
  waiting: [],
  question: null,
  candidateRelationship: "tasks",
  decisionGroups: [],
  failureTitle,
  failureMessage,
});

export const buildClarityV1Analysis = (
  rawInput: string,
  result: ClarityV1Result
): ClarityAnalysis => {
  const boardTitles = dedupeStrings(result.considered_items).slice(0, 10);

  if (!boardTitles.length) {
    return createClarityV1Failure(rawInput);
  }

  const bestTitle = boardTitles[0];
  const orderedTitles = boardTitles;

  const candidates = orderedTitles.map((title, index) =>
    createCandidate(
      title,
      index === 0 ? "best" : "still",
      index,
      index === 0 ? result.why_first ?? "" : ""
    )
  );

  return {
    status: "ready",
    rawInput,
    source: "ai",
    mode: candidates.length <= 1 ? "single" : candidates.length === 2 ? "compare" : "fog",
    decisionShape:
      candidates.length <= 1 ? "single_action" : candidates.length === 2 ? "option_choice" : "foggy_dump",
    decisionGate: candidates.length <= 2 ? "fast" : "moderate",
    contextKinds: [],
    contextHints: result.context_notes,
    summary: "I split the input into the real tasks or dilemmas, then passed them to the app logic.",
    firstMove: candidates[0] ?? null,
    candidates,
    activeItems: candidates.slice(1),
    laterItems: [],
    waiting: candidates.slice(1),
    question: null,
    candidateRelationship: candidates.length === 2 ? "alternatives" : "tasks",
    decisionGroups: [],
    structuredCleanup: result,
  };
};
