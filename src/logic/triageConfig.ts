import type {
  DelayImpact,
  DueWindow,
  HandlingChoice,
  ImportanceSignal,
  ImpactArea,
  TriageAnswers,
} from "../types/decision";

export const DEFAULT_TRIAGE_ANSWERS: TriageAnswers = {
  hasDeadline: false,
  dueWindow: "noDeadline",
  delayImpact: "annoying" as DelayImpact,
  impactAreas: [] as ImpactArea[],
  importanceSignal: "unclear" as ImportanceSignal,
  handlingChoice: "direct" as HandlingChoice,
};

export const URGENCY_WEIGHTS: Record<DueWindow, number> = {
  today: 6.5,
  tomorrow: 4.8,
  thisWeek: 3.1,
  later: 1.6,
  noDeadline: 0.4,
};

export const DELAY_URGENCY_WEIGHTS: Record<DelayImpact, number> = {
  none: 0,
  annoying: 1.2,
  disruptive: 2.5,
  severe: 3.6,
};

export const IMPORTANCE_SIGNAL_WEIGHTS: Record<ImportanceSignal, number> = {
  meaningful: 2.8,
  unclear: 1,
  mostlyNoise: -1.6,
};

export const IMPACT_AREA_WEIGHTS: Record<ImpactArea, number> = {
  health: 3.3,
  safety: 3.3,
  housing: 3.2,
  money: 3,
  work: 3,
  longTermGoals: 3.2,
  relationships: 2.2,
  reputation: 1.5,
};

export const TRIAGE_THRESHOLDS = {
  urgent: 6,
  important: 5.6,
};
