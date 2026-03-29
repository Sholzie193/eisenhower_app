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
