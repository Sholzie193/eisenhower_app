export type AiCleanupDecisionType =
  | "single_task"
  | "option_choice"
  | "multiple_decisions"
  | "foggy_dump";

export type AiCleanupItemType = "task" | "option" | "obligation";
export type AiCleanupQuadrant = "do_now" | "schedule" | "delegate" | "eliminate";

export interface AiCleanupSummary {
  situation: string;
  primary_recommendation: string;
  primary_reason: string;
}

export interface AiCleanupItem {
  id: string;
  title: string;
  details?: string;
  type: AiCleanupItemType;
  decision_group: string;
  quadrant: AiCleanupQuadrant;
  urgency: number;
  importance: number;
  cost_of_delay: number;
  reversibility: number;
  friction: number;
  energy_fit: number;
  upside: number;
  why: string;
}

export interface AiCleanupDecisionGroup {
  id: string;
  label: string;
}

export interface AiCleanupPresentation {
  show_now: string[];
  show_next: string[];
  show_later: string[];
}

export interface AiCleanupResult {
  decision_type: AiCleanupDecisionType;
  summary: AiCleanupSummary;
  items: AiCleanupItem[];
  context: string[];
  tradeoffs: string[];
  decision_groups: AiCleanupDecisionGroup[];
  presentation: AiCleanupPresentation;
}
