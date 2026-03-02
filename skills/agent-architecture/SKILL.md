---
name: agent-architecture
description: Designs, builds, and evaluates AI agent systems. Use when architecting a new agent, choosing between workflows vs agents, selecting the right pattern (chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer), or debugging an agent in production. Loads patterns.md for implementation guidance and tool-design.md for ACI best practices.
---
# Agent Architecture Skill
## When to Use This Skill
- Designing a new AI agent or agentic system
- Choosing between a workflow and a true agent
- Selecting the right architectural pattern for a task
- Designing tools and the Agent-Computer Interface (ACI)
- Debugging agent failures in production
- Evaluating whether to add complexity to an existing system
## Core Philosophy
Success in the LLM space isn't about building the most sophisticated system. It's about building the *right* system for your needs.
**The three core principles:**
1. **Simplicity** — maintain simplicity in your agent's design
2. **Transparency** — explicitly show the agent's planning steps
3. **Tool quality** — carefully craft the ACI through thorough documentation and testing
Start with simple prompts. Optimize with evaluation. Add multi-step agentic systems only when simpler solutions fall short.
## Key Definitions
**Workflow:** LLMs and tools orchestrated through predefined code paths. Predictable, consistent, lower cost.
**Agent:** LLMs dynamically directing their own processes and tool usage. Flexible, powerful, higher cost and latency.
**Augmented LLM:** The basic building block — an LLM enhanced with retrieval, tools, and memory.
## Decision Rule
- Can the task be decomposed into fixed subtasks? → Use a **workflow**
- Does the task require flexibility and model-driven decisions at scale? → Use an **agent**
- Is a single optimized LLM call with retrieval enough? → Use that. Don't over-engineer.
## Bundled Files
- `patterns.md` — All five workflow patterns with when-to-use guidance and examples
- `tool-design.md` — ACI best practices, tool documentation standards, and common mistakes
