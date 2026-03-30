import type { AiCleanupResult, AiCleanupSummary } from "./ai-cleanup";

export type Quadrant = "doNow" | "schedule" | "delegate" | "eliminate";

export type DueWindow = "today" | "tomorrow" | "thisWeek" | "later" | "noDeadline";
export type DelayImpact = "none" | "annoying" | "disruptive" | "severe";
export type ImportanceSignal = "meaningful" | "unclear" | "mostlyNoise";
export type HandlingChoice = "direct" | "delegate" | "automate" | "reduce" | "ignore";
export type ImpactArea =
  | "money"
  | "health"
  | "safety"
  | "work"
  | "housing"
  | "longTermGoals"
  | "relationships"
  | "reputation";

export interface TriageAnswers {
  hasDeadline: boolean;
  dueWindow: DueWindow;
  delayImpact: DelayImpact;
  impactAreas: ImpactArea[];
  importanceSignal: ImportanceSignal;
  handlingChoice: HandlingChoice;
}

export interface DecisionItem {
  id: string;
  title: string;
  notes: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  urgencyScore: number;
  importanceScore: number;
  quadrant: Quadrant;
  triageAnswers: TriageAnswers;
  recommendation: string;
  nextStep: string;
  explanation: string;
  completed: boolean;
}

export interface DraftDecision {
  editingId?: string;
  title: string;
  notes: string;
  category: string;
  triageAnswers: TriageAnswers;
}

export interface TriageResult {
  urgencyScore: number;
  importanceScore: number;
  quadrant: Quadrant;
  recommendation: string;
  nextStep: string;
  explanation: string;
  urgencyReasons: string[];
  importanceReasons: string[];
}

export type ClarityMode = "single" | "compare" | "fog";
export type ClarityQuestionKind = "deadline" | "relief" | "downside" | "longTerm";
export type ClarityCandidateRelationship = "tasks" | "alternatives";
export type DecisionShape = "single_action" | "option_choice" | "multiple_decisions" | "foggy_dump";
export type DecisionGate = "fast" | "moderate" | "careful";

export interface ClarityCandidate {
  id: string;
  title: string;
  sourceText: string;
  category: string;
  triageAnswers: TriageAnswers;
  triageResult: TriageResult;
  delayCostScore: number;
  longTermScore: number;
  reliefScore: number;
  reversibilityScore: number;
  executionEaseScore: number;
  decisionFitScore: number;
  compositeScore: number;
  calmingWhy: string;
  reasonTags: string[];
}

export interface ClarityQuestion {
  kind: ClarityQuestionKind;
  prompt: string;
  candidateIds: string[];
  selectedId?: string;
}

export interface ClarityDecisionGroup {
  id: string;
  label: string;
  tradeoffHint?: string;
  sourceText: string;
  candidateTexts: string[];
  candidateRelationship: ClarityCandidateRelationship;
}

export interface ClarityAnalysis {
  status: "ready" | "failed";
  rawInput: string;
  source: "ai";
  mode: ClarityMode;
  decisionShape: DecisionShape;
  decisionGate: DecisionGate;
  decisionLabel?: string;
  contextKinds: string[];
  contextHints: string[];
  summary: string;
  aiSummary?: AiCleanupSummary;
  firstMove: ClarityCandidate | null;
  candidates: ClarityCandidate[];
  activeItems: ClarityCandidate[];
  laterItems: ClarityCandidate[];
  waiting: ClarityCandidate[];
  question: ClarityQuestion | null;
  candidateRelationship: ClarityCandidateRelationship;
  decisionGroups: ClarityDecisionGroup[];
  activeDecisionGroupId?: string;
  narrowedFromCount?: number;
  structuredCleanup?: AiCleanupResult;
  failureTitle?: string;
  failureMessage?: string;
}
