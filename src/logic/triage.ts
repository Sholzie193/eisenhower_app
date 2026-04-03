import { DUE_WINDOW_LABELS, IMPACT_AREA_LABELS } from "../constants/quadrants";
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

const SHOULD_NOT_ELIMINATE_AREAS: TriageAnswers["impactAreas"] = [
  "money",
  "work",
  "housing",
  "relationships",
  "reputation",
  "longTermGoals",
  "health",
  "safety",
];

const shouldAvoidEliminate = (
  answers: TriageAnswers,
  urgencyScore: number,
  importanceScore: number
) => {
  if (
    answers.handlingChoice === "ignore" &&
    !answers.hasDeadline &&
    answers.delayImpact === "none" &&
    answers.importanceSignal === "mostlyNoise"
  ) {
    return false;
  }

  if (answers.hasDeadline || answers.delayImpact === "disruptive" || answers.delayImpact === "severe") {
    return true;
  }

  if (answers.importanceSignal === "meaningful") {
    return true;
  }

  if (
    answers.importanceSignal !== "mostlyNoise" &&
    answers.impactAreas.some((area) => SHOULD_NOT_ELIMINATE_AREAS.includes(area))
  ) {
    return true;
  }

  return urgencyScore >= 4.2 && importanceScore >= 3.4;
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

const getDueWindowSummary = (answers: TriageAnswers) => {
  if (!answers.hasDeadline || answers.dueWindow === "noDeadline") {
    return "there is no real deadline";
  }

  switch (answers.dueWindow) {
    case "today":
      return "it has a real deadline today";
    case "tomorrow":
      return "it has a real deadline tomorrow";
    case "thisWeek":
      return "it has a real deadline this week";
    case "later":
    default:
      return "it has a real deadline, but not an immediate one";
  }
};

const getDelaySummary = (delayImpact: TriageAnswers["delayImpact"]) => {
  switch (delayImpact) {
    case "severe":
      return "delay would create real damage quickly";
    case "disruptive":
      return "delay would create meaningful friction";
    case "annoying":
      return "delay would be mildly annoying";
    case "none":
    default:
      return "there is very little downside if it waits";
  }
};

const getImportanceSummary = (answers: TriageAnswers) => {
  const areaSummary = getAreaSummary(answers.impactAreas);

  if (!areaSummary) {
    return answers.importanceSignal === "mostlyNoise"
      ? "it does not seem to affect a core area right now"
      : "it does not clearly affect a core area right now";
  }

  if (answers.importanceSignal === "meaningful") {
    return `it clearly affects ${areaSummary.toLowerCase()}`;
  }

  if (answers.importanceSignal === "mostlyNoise") {
    return `it touches ${areaSummary.toLowerCase()}, while the underlying significance still looks light`;
  }

  return `it touches ${areaSummary.toLowerCase()}, while the overall importance is still a little unclear`;
};

const getHandlingSummary = (handlingChoice: TriageAnswers["handlingChoice"]) => {
  switch (handlingChoice) {
    case "delegate":
      return "A handoff is likely cleaner than carrying it yourself.";
    case "automate":
      return "This looks better handled with a template, shortcut, or repeatable system.";
    case "reduce":
      return "The need may be real, but the full version looks heavier than necessary.";
    case "ignore":
      return "It may be better to let this stay out of the active list unless something changes.";
    case "direct":
    default:
      return "";
  }
};

const buildExplanation = (quadrant: Quadrant, answers: TriageAnswers) => {
  const deadlineSummary = getDueWindowSummary(answers);
  const delaySummary = getDelaySummary(answers.delayImpact);
  const importanceSummary = getImportanceSummary(answers);
  const handlingSummary = getHandlingSummary(answers.handlingChoice);

  if (quadrant === "doNow") {
    return [
      `This looks worth moving now because ${deadlineSummary} and ${delaySummary}.`,
      `It also matters because ${importanceSummary}.`,
    ].join(" ");
  }

  if (quadrant === "schedule") {
    return [
      `This matters because ${importanceSummary}, but ${deadlineSummary === "there is no real deadline" ? "there is no hard time pressure pulling it into today" : deadlineSummary.replace(/^it /, "the deadline ") + " is not strong enough to make it a now-task"}.`,
      answers.delayImpact === "none" || answers.delayImpact === "annoying"
        ? "Planning it deliberately should reduce the mental drag without treating it like an emergency."
        : "It is worth giving a protected slot before the friction grows."
    ].join(" ");
  }

  if (quadrant === "delegate") {
    return [
      `This has enough time pressure that it should not be ignored, but ${importanceSummary}.`,
      answers.handlingChoice === "direct"
        ? "It looks more like something to keep moving with minimal direct effort than something to personally invest in deeply."
        : handlingSummary,
    ].join(" ");
  }

  return [
    answers.importanceSignal === "mostlyNoise"
      ? `This looks low-pressure because ${deadlineSummary}, ${delaySummary}, and it mostly seems like background noise rather than a core priority.`
      : `This looks low-pressure because ${deadlineSummary}, ${delaySummary}, and ${importanceSummary}.`,
    answers.handlingChoice === "ignore"
      ? "Letting it leave the active list is probably the cleanest move."
      : "Keeping it out of the active list is unlikely to cost much right now.",
  ].join(" ");
};

export const getQuadrantGuidance = (
  quadrant: Quadrant,
  answers: TriageAnswers
): Pick<TriageResult, "recommendation" | "nextStep"> => {
  if (quadrant === "doNow") {
    return {
      recommendation:
        answers.hasDeadline || answers.delayImpact === "severe"
          ? "Move this now while the pressure is real."
          : "Take the smallest meaningful step now.",
      nextStep:
        answers.hasDeadline && answers.dueWindow === "today"
          ? "Do the first useful part before you leave this screen."
          : "Start the smallest useful step so this stops sitting in your head.",
    };
  }

  if (quadrant === "schedule") {
    return {
      recommendation:
        answers.hasDeadline && answers.dueWindow !== "later" && answers.dueWindow !== "noDeadline"
          ? "Put this on the calendar before the deadline starts running the day."
          : "Protect a calm time block instead of treating this like a today problem.",
      nextStep:
        answers.dueWindow === "later" || answers.dueWindow === "noDeadline"
          ? "Pick a specific day and a short time block so it stops floating around."
          : `Block a short session ${DUE_WINDOW_LABELS[answers.dueWindow].toLowerCase()} and define what done looks like.`,
    };
  }

  if (quadrant === "delegate") {
    if (answers.handlingChoice === "delegate") {
      return {
        recommendation: "Hand this off instead of carrying it yourself.",
        nextStep: "Choose the person, message, or handoff you need and send it.",
      };
    }

    if (answers.handlingChoice === "automate") {
      return {
        recommendation: "Set up a lighter system instead of repeating this manually.",
        nextStep: "Create the template, shortcut, or recurring setup that removes the repeat effort.",
      };
    }

    if (answers.handlingChoice === "reduce") {
      return {
        recommendation: "Keep only the minimum version that handles the need.",
        nextStep: "Trim the task to the smallest acceptable version and stop there.",
      };
    }

    if (answers.handlingChoice === "ignore") {
      return {
        recommendation: "Let this pass unless it becomes more real.",
        nextStep: "Remove it from the active list and only revisit if the consequences change.",
      };
    }

    return {
      recommendation: "Keep this moving with the lightest-touch response.",
      nextStep: "Do the minimum needed to prevent friction, then move on.",
    };
  }

  if (answers.handlingChoice === "ignore" || answers.importanceSignal === "mostlyNoise") {
    return {
      recommendation: "Let this leave the active list for now.",
      nextStep: "Archive it, snooze it, or move it to a later list so it stops taking foreground attention.",
    };
  }

  return {
    recommendation: "Move this out of sight so it stops taking mental space.",
    nextStep: "Archive it or set a distant review point if you still want to keep a loose note of it.",
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
  if (answers.delayImpact === "severe") {
    urgencyReasons.push("Delay would cause real damage quickly.");
  } else if (answers.delayImpact === "disruptive") {
    urgencyReasons.push("Delay would create meaningful friction quickly.");
  } else if (answers.delayImpact === "annoying") {
    urgencyReasons.push("Delay would be annoying, but not deeply costly.");
  } else {
    urgencyReasons.push("Waiting does not seem to create much downside.");
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
    importanceReasons.push("It may feel loud, but the underlying significance looks light.");
  }

  if (answers.handlingChoice !== "direct") {
    importanceReasons.push(getHandlingSummary(answers.handlingChoice));
  }

  const normalizedUrgency = clampScore(urgencyScore);
  const normalizedImportance = clampScore(importanceScore);
  const baseQuadrant = getQuadrantFromScores(normalizedUrgency, normalizedImportance);
  const quadrant =
    baseQuadrant === "eliminate" && shouldAvoidEliminate(answers, normalizedUrgency, normalizedImportance)
      ? normalizedUrgency >= 4.2
        ? "delegate"
        : "schedule"
      : baseQuadrant;
  const guidance = getQuadrantGuidance(quadrant, answers);

  const explanation = buildExplanation(quadrant, answers);

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
