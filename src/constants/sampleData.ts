import { evaluateTriage } from "../logic/triage";
import { createId } from "../utils/id";
import type { DecisionItem, TriageAnswers } from "../types/decision";

const createSampleItem = (
  title: string,
  notes: string,
  category: string,
  answers: TriageAnswers,
  createdOffsetHours: number
): DecisionItem => {
  const result = evaluateTriage(answers);
  const date = new Date(Date.now() - createdOffsetHours * 60 * 60 * 1000).toISOString();

  return {
    id: createId(),
    title,
    notes,
    category,
    createdAt: date,
    updatedAt: date,
    urgencyScore: result.urgencyScore,
    importanceScore: result.importanceScore,
    quadrant: result.quadrant,
    triageAnswers: answers,
    recommendation: result.recommendation,
    nextStep: result.nextStep,
    explanation: result.explanation,
    completed: false,
  };
};

export const sampleItems: DecisionItem[] = [
  createSampleItem(
    "Send landlord documents",
    "Lease renewal paperwork is sitting in drafts. It needs a clean response today.",
    "Home",
    {
      hasDeadline: true,
      dueWindow: "today",
      delayImpact: "severe",
      impactAreas: ["housing", "money"],
      importanceSignal: "meaningful",
      handlingChoice: "direct",
    },
    3
  ),
  createSampleItem(
    "Book annual health check",
    "Nothing is wrong, but I keep pushing this off and it matters.",
    "Personal",
    {
      hasDeadline: false,
      dueWindow: "noDeadline",
      delayImpact: "disruptive",
      impactAreas: ["health", "longTermGoals"],
      importanceSignal: "meaningful",
      handlingChoice: "direct",
    },
    14
  ),
  createSampleItem(
    "Tidy shared inbox follow-ups",
    "A few quick replies are time-sensitive, but most of them can be templated.",
    "Work",
    {
      hasDeadline: true,
      dueWindow: "today",
      delayImpact: "annoying",
      impactAreas: ["work"],
      importanceSignal: "unclear",
      handlingChoice: "automate",
    },
    28
  ),
  createSampleItem(
    "Reorganize old screenshots",
    "This keeps calling for attention, but there is no consequence if I leave it alone.",
    "Admin",
    {
      hasDeadline: false,
      dueWindow: "noDeadline",
      delayImpact: "none",
      impactAreas: [],
      importanceSignal: "mostlyNoise",
      handlingChoice: "ignore",
    },
    46
  ),
];
