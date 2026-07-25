export type CanaryObservation = {
  engine: string;
  date: string;
  vectorsEchoed: string[];
  notes: string;
};

// Add a new row per observation. `vectorsEchoed` lists the vector letters
// (A-F, see /labs/llm-canary) that the engine reproduced verbatim when asked
// to summarize the lab page. Leave it empty if none were echoed.
export const CANARY_RESULTS: CanaryObservation[] = [
  {
    engine: "(pending first observation)",
    date: "2026-07-25",
    vectorsEchoed: [],
    notes:
      "Placeholder row. Run the reproduction prompts from the lab page against a real assistant, record which vectors it echoed, and replace this entry.",
  },
];
