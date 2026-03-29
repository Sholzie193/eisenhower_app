import { DUE_WINDOW_LABELS, IMPACT_AREA_LABELS, QUADRANT_META } from "../constants/quadrants";
import type { DecisionItem, TriageAnswers } from "../types/decision";

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

export const describeAnswers = (answers: TriageAnswers) => [
  {
    label: "Deadline",
    value: answers.hasDeadline ? DUE_WINDOW_LABELS[answers.dueWindow] : "No hard deadline",
  },
  {
    label: "Cost of delay",
    value:
      answers.delayImpact === "none"
        ? "Almost none"
        : answers.delayImpact === "annoying"
          ? "Mild friction"
          : answers.delayImpact === "disruptive"
            ? "Noticeable disruption"
            : "Serious consequence",
  },
  {
    label: "Core areas",
    value: answers.impactAreas.length
      ? answers.impactAreas.map((area) => IMPACT_AREA_LABELS[area]).join(", ")
      : "None selected",
  },
  {
    label: "Importance check",
    value:
      answers.importanceSignal === "meaningful"
        ? "Truly important"
        : answers.importanceSignal === "unclear"
          ? "Mixed"
          : "Mostly noise",
  },
  {
    label: "Best handling",
    value:
      answers.handlingChoice === "direct"
        ? "Direct attention"
        : answers.handlingChoice === "delegate"
          ? "Delegate"
          : answers.handlingChoice === "automate"
            ? "Automate"
            : answers.handlingChoice === "reduce"
              ? "Reduce"
              : "Ignore",
  },
];

export const getItemSubtitle = (item: DecisionItem) =>
  item.category || QUADRANT_META[item.quadrant].label;
