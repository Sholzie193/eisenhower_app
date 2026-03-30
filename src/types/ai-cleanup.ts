export type AiCleanupDecisionType =
  | "single_task"
  | "option_choice"
  | "multiple_decisions"
  | "foggy_dump";

export interface AiCleanupAction {
  title: string;
  details?: string;
  decision_group: string;
}

export interface AiCleanupDecisionGroup {
  id: string;
  label: string;
}

export interface AiCleanupResult {
  decision_type: AiCleanupDecisionType;
  actions: AiCleanupAction[];
  context: string[];
  tradeoffs: string[];
  decision_groups: AiCleanupDecisionGroup[];
}
