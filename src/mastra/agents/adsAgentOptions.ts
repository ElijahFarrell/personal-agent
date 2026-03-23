/**
 * Mastra agent options for multi-tool SEARCH_API runs (parallel tool calls where the model supports it).
 */
export const ADS_AGENT_GENERATE_OPTS = {
  maxSteps: 24,
  providerOptions: {
    openai: {
      parallelToolCalls: true,
    },
  },
} as const
