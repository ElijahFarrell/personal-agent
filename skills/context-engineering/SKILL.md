---
name: context-engineering
description: Optimizes the configuration of context (tokens) provided to an LLM to achieve reliable, high-quality agent behavior. Use when designing system prompts, managing agent memory, handling long-horizon tasks, or debugging agents that lose coherence over time. Loads principles.md for core guidance and long-horizon.md for extended task techniques.
---
# Context Engineering Skill
## When to Use This Skill
- Designing or refining system prompts for any agent
- Agent is losing coherence or "forgetting" things mid-task
- Building agents that need to work over long time horizons
- Designing tool return formats for token efficiency
- Debugging agents that perform well on short tasks but fail on long ones
- Choosing between compaction, note-taking, or sub-agent architectures
## Core Definition
**Context engineering** = the set of strategies for curating and maintaining the optimal set of tokens during LLM inference, including system instructions, tools, MCP, external data, and message history.
**The guiding principle:** Find the *smallest possible* set of *high-signal* tokens that maximize the likelihood of the desired outcome.
## Key Concept: Context Rot
As the number of tokens in the context window increases, the model's ability to accurately recall information from that context decreases. Context must be treated as a **finite resource with diminishing marginal returns**.
Every new token introduced depletes the model's "attention budget." Curate ruthlessly.
## The Hierarchy of Context Components
1. **System prompt** — instructions, tools, background, output format
2. **Tools** — the agent's interface to the world
3. **Few-shot examples** — canonical examples of desired behavior
4. **Message history** — the conversation so far
5. **Retrieved context** — just-in-time data pulled at runtime
Each component must earn its place. If it doesn't improve the outcome, remove it.
## Bundled Files
- `principles.md` — System prompt design, tool context, few-shot prompting, and retrieval strategies
- `long-horizon.md` — Compaction, structured note-taking, and sub-agent architectures for extended tasks
