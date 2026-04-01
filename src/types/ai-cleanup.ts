export interface AiCleanupResult {
  considered_items: string[];
  best_next_move: string;
  why_first: string;
  still_in_play: string[];
  what_can_wait: string[];
  context_notes: string[];
  decision_type?: "single_task" | "option_choice" | "multiple_decisions" | "foggy_dump";
  summary?: {
    situation: string;
    primary_recommendation: string;
    primary_reason: string;
  };
  items?: Array<{
    id: string;
    title: string;
    details?: string;
    type: "task" | "option" | "obligation";
    decision_group: string;
    quadrant: "do_now" | "schedule" | "delegate" | "eliminate";
    urgency: number;
    importance: number;
    cost_of_delay: number;
    reversibility: number;
    friction: number;
    energy_fit: number;
    upside: number;
    why: string;
  }>;
  context?: string[];
  tradeoffs?: string[];
  decision_groups?: Array<{ id: string; label: string }>;
  presentation?: {
    show_now: string[];
    show_next: string[];
    show_later: string[];
  };
}
