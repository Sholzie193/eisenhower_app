import type { AiCleanupResult } from "../../types/ai-cleanup";

export type ClarityV1Result = AiCleanupResult;

export const CLARITY_V1_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "considered_items",
    "best_next_move",
    "why_first",
    "still_in_play",
    "what_can_wait",
    "context_notes",
  ],
  properties: {
    considered_items: {
      type: "array",
      maxItems: 5,
      items: { type: "string" },
    },
    best_next_move: { type: "string" },
    why_first: { type: "string" },
    still_in_play: {
      type: "array",
      maxItems: 3,
      items: { type: "string" },
    },
    what_can_wait: {
      type: "array",
      maxItems: 3,
      items: { type: "string" },
    },
    context_notes: {
      type: "array",
      maxItems: 5,
      items: { type: "string" },
    },
  },
} as const;
