import { QUADRANT_ORDER } from "../constants/quadrants";
import type { DecisionItem, Quadrant } from "../types/decision";

const DEADLINE_PRIORITY: Record<DecisionItem["triageAnswers"]["dueWindow"], number> = {
  today: 1.8,
  tomorrow: 1.2,
  thisWeek: 0.7,
  later: 0.2,
  noDeadline: 0,
};

const DELAY_PRIORITY: Record<DecisionItem["triageAnswers"]["delayImpact"], number> = {
  none: 0,
  annoying: 0.45,
  disruptive: 0.9,
  severe: 1.3,
};

const IMPORTANCE_SIGNAL_PRIORITY: Record<DecisionItem["triageAnswers"]["importanceSignal"], number> = {
  meaningful: 0.8,
  unclear: 0.25,
  mostlyNoise: -0.5,
};

const HANDLING_PRIORITY: Record<DecisionItem["triageAnswers"]["handlingChoice"], number> = {
  direct: 0.15,
  delegate: 0.35,
  automate: 0.35,
  reduce: 0.25,
  ignore: -0.15,
};

export const getQuadrantPriorityScore = (item: DecisionItem) => {
  const answers = item.triageAnswers;
  const deadlineBoost = answers.hasDeadline ? DEADLINE_PRIORITY[answers.dueWindow] : 0;
  const delayBoost = DELAY_PRIORITY[answers.delayImpact];
  const importanceSignalBoost = IMPORTANCE_SIGNAL_PRIORITY[answers.importanceSignal];
  const handlingBoost = HANDLING_PRIORITY[answers.handlingChoice];

  switch (item.quadrant) {
    case "doNow":
      return item.urgencyScore * 0.72 + item.importanceScore * 0.58 + deadlineBoost + delayBoost * 0.8;
    case "schedule":
      return item.importanceScore * 0.82 + item.urgencyScore * 0.2 + deadlineBoost * 0.8 + importanceSignalBoost;
    case "delegate":
      return item.urgencyScore * 0.62 + item.importanceScore * 0.24 + deadlineBoost * 0.6 + delayBoost * 0.4 + handlingBoost;
    case "eliminate":
      return item.importanceScore * 0.14 + item.urgencyScore * 0.14 + importanceSignalBoost * 0.3 + handlingBoost * 0.2;
    default:
      return 0;
  }
};

const getQuadrantIndex = (quadrant: Quadrant) => QUADRANT_ORDER.indexOf(quadrant);

export const compareItemsByPriority = (left: DecisionItem, right: DecisionItem) => {
  const quadrantGap = getQuadrantIndex(left.quadrant) - getQuadrantIndex(right.quadrant);
  if (quadrantGap !== 0) {
    return quadrantGap;
  }

  const priorityGap = getQuadrantPriorityScore(right) - getQuadrantPriorityScore(left);
  if (Math.abs(priorityGap) > 0.01) {
    return priorityGap;
  }

  const createdGap = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  if (createdGap !== 0) {
    return createdGap;
  }

  return left.id.localeCompare(right.id);
};

export const sortItemsByPriority = (items: DecisionItem[]) => [...items].sort(compareItemsByPriority);
