import type { AiCleanupResult } from "../../types/ai-cleanup";

export type ClarityV1Result = AiCleanupResult;

export const CLARITY_V1_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["considered_items", "context_notes", "decision_type", "decision_groups"],
  properties: {
    considered_items: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
    context_notes: {
      type: "array",
      maxItems: 5,
      items: { type: "string" },
    },
    decision_type: {
      type: "string",
      enum: ["single_task", "option_choice", "multiple_decisions", "foggy_dump"],
    },
    decision_groups: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label", "items", "candidate_relationship"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          items: {
            type: "array",
            maxItems: 6,
            items: { type: "string" },
          },
          candidate_relationship: {
            type: "string",
            enum: ["tasks", "alternatives"],
          },
        },
      },
    },
  },
} as const;
