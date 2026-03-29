import type { DueWindow, ImpactArea, Quadrant } from "../types/decision";

export const QUADRANT_ORDER: Quadrant[] = ["doNow", "schedule", "delegate", "eliminate"];

export const QUADRANT_META: Record<
  Quadrant,
  {
    label: string;
    shortLabel: string;
    description: string;
    recommendation: string;
    nextStep: string;
  }
> = {
  doNow: {
    label: "Do Now",
    shortLabel: "Now",
    description: "Urgent and meaningful.",
    recommendation: "Take one immediate action now.",
    nextStep: "Start the smallest useful step before you leave this screen.",
  },
  schedule: {
    label: "Schedule",
    shortLabel: "Plan",
    description: "Important, not urgent.",
    recommendation: "Pick a time and plan it.",
    nextStep: "Choose a time block and define what done looks like.",
  },
  delegate: {
    label: "Delegate / Reduce",
    shortLabel: "Reduce",
    description: "Urgent, but not worth your full attention.",
    recommendation: "Reduce direct effort.",
    nextStep: "Delegate, automate, batch, or lower the scope on purpose.",
  },
  eliminate: {
    label: "Eliminate / Ignore",
    shortLabel: "Drop",
    description: "Low value and low urgency.",
    recommendation: "Drop it or move it out of sight.",
    nextStep: "Archive it or set a distant review date if it still matters.",
  },
};

export const DUE_WINDOW_LABELS: Record<DueWindow, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  thisWeek: "This week",
  later: "Later",
  noDeadline: "No deadline",
};

export const IMPACT_AREA_LABELS: Record<ImpactArea, string> = {
  money: "Money",
  health: "Health",
  safety: "Safety",
  work: "Work stability",
  housing: "Housing",
  longTermGoals: "Long-term goals",
  relationships: "Relationships",
  reputation: "Reputation",
};
