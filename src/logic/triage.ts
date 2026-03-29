import { DUE_WINDOW_LABELS, IMPACT_AREA_LABELS, QUADRANT_META } from "../constants/quadrants";
import {
  DEFAULT_TRIAGE_ANSWERS,
  DELAY_URGENCY_WEIGHTS,
  IMPACT_AREA_WEIGHTS,
  IMPORTANCE_SIGNAL_WEIGHTS,
  TRIAGE_THRESHOLDS,
  URGENCY_WEIGHTS,
} from "./triageConfig";
import type { Quadrant, TriageAnswers, TriageResult } from "../types/decision";

const clampScore = (score: number) => Math.max(0, Math.min(10, Number(score.toFixed(1))));

export const getQuadrantFromScores = (
  urgencyScore: number,
  importanceScore: number
): Quadrant => {
  if (urgencyScore >= TRIAGE_THRESHOLDS.urgent && importanceScore >= TRIAGE_THRESHOLDS.important) {
    return "doNow";
  }

  if (importanceScore >= TRIAGE_THRESHOLDS.important) {
    return "schedule";
  }

  if (urgencyScore >= TRIAGE_THRESHOLDS.urgent) {
    return "delegate";
  }

  return "eliminate";
};

const getAreaSummary = (areas: TriageAnswers["impactAreas"]) => {
  if (!areas.length) {
    return "";
  }

  const labels = areas.map((area) => IMPACT_AREA_LABELS[area]);

  if (labels.length === 1) {
    return labels[0];
  }

  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }

  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
};

export const getQuadrantGuidance = (
  quadrant: Quadrant,
  answers: TriageAnswers
): Pick<TriageResult, "recommendation" | "nextStep"> => {
  const meta = QUADRANT_META[quadrant];

  if (quadrant === "delegate" && answers.handlingChoice !== "direct") {
    return {
      recommendation: "Reduce the amount of direct energy this receives.",
      nextStep:
        answers.handlingChoice === "delegate"
          ? "Choose the person, message, or handoff you need and send it."
          : answers.handlingChoice === "automate"
            ? "Set up the shortcut, template, or recurring system that removes repeat effort."
            : answers.handlingChoice === "reduce"
              ? "Trim the task to a lighter version that still handles the need."
              : "Decide to let this pass and keep your focus for what matters more.",
    };
  }

  if (quadrant === "schedule") {
    return {
      recommendation: meta.recommendation,
      nextStep:
        answers.dueWindow === "later" || answers.dueWindow === "noDeadline"
          ? "Pick a specific day and a short time block so it stops floating around."
          : meta.nextStep,
    };
  }

  return {
    recommendation: meta.recommendation,
    nextStep: meta.nextStep,
  };
};

export const evaluateTriage = (answers: TriageAnswers = DEFAULT_TRIAGE_ANSWERS): TriageResult => {
  const urgencyReasons: string[] = [];
  const importanceReasons: string[] = [];

  let urgencyScore = URGENCY_WEIGHTS[answers.hasDeadline ? answers.dueWindow : "noDeadline"];
  if (answers.hasDeadline) {
    urgencyScore += 0.6;
    urgencyReasons.push(`It has a real time boundary: ${DUE_WINDOW_LABELS[answers.dueWindow].toLowerCase()}.`);
  } else {
    urgencyReasons.push("There is no hard deadline pulling it forward.");
  }

  urgencyScore += DELAY_URGENCY_WEIGHTS[answers.delayImpact];
  if (answers.delayImpact === "disruptive" || answers.delayImpact === "severe") {
    urgencyReasons.push("Delay creates meaningful friction quickly.");
  }

  const cappedAreaScore = Math.min(
    answers.impactAreas.reduce((total, area) => total + IMPACT_AREA_WEIGHTS[area], 0),
    6.6
  );

  let importanceScore = cappedAreaScore;
  importanceScore += IMPORTANCE_SIGNAL_WEIGHTS[answers.importanceSignal];

  if (answers.impactAreas.length) {
    importanceReasons.push(`It touches ${getAreaSummary(answers.impactAreas)}.`);
  } else {
    importanceReasons.push("It does not touch a core life area based on your answers.");
  }

  if (answers.importanceSignal === "meaningful") {
    importanceReasons.push("You marked it as genuinely important, not just loud.");
  }

  if (answers.importanceSignal === "mostlyNoise") {
    importanceReasons.push("It may feel pressing, but the underlying significance looks light.");
  }

  if (answers.handlingChoice !== "direct") {
    importanceReasons.push(
      "The handling choice informs the recommendation, but it does not change the Eisenhower score."
    );
  }

  const normalizedUrgency = clampScore(urgencyScore);
  const normalizedImportance = clampScore(importanceScore);
  const quadrant = getQuadrantFromScores(normalizedUrgency, normalizedImportance);
  const guidance = getQuadrantGuidance(quadrant, answers);

  const explanation = [
    normalizedUrgency >= TRIAGE_THRESHOLDS.urgent
      ? "This carries genuine time pressure based on deadline and cost of delay."
      : "This does not need immediate motion.",
    normalizedImportance >= TRIAGE_THRESHOLDS.important
      ? "It also carries real importance based on what it affects."
      : "Its significance looks limited once urgency is separated from importance.",
    QUADRANT_META[quadrant].description,
  ].join(" ");

  return {
    urgencyScore: normalizedUrgency,
    importanceScore: normalizedImportance,
    quadrant,
    recommendation: guidance.recommendation,
    nextStep: guidance.nextStep,
    explanation,
    urgencyReasons,
    importanceReasons,
  };
};
