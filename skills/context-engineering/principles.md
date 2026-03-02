# Context Engineering Principles
## System Prompt Design
### The Right Altitude
The system prompt must operate at the "Goldilocks zone" between two failure modes:
- **Too specific:** Hardcoded, brittle logic that breaks on edge cases and increases maintenance complexity
- **Too vague:** High-level guidance that fails to give the LLM concrete signals for desired outputs
**The right altitude:** Specific enough to guide behavior effectively, flexible enough to provide strong heuristics.
### Structure
Organize prompts into distinct sections using XML tags or Markdown headers:
```
<background_information>
Who the agent is, what it does, who it serves.
</background_information>
<instructions>
What the agent should do, step by step.
</instructions>
## Tool guidance
When and how to use each tool.
## Output description
What the output should look like, format, length, tone.
```
### The Minimalism Rule
Strive for the minimal set of information that fully outlines expected behavior. Minimal does not mean short — it means no unnecessary tokens. Start with the minimum, test, then add only what demonstrably improves performance.
### Common System Prompt Mistakes
- Including information the agent will never need
- Listing every possible edge case instead of curating canonical examples
- Using vague language ("be helpful") without concrete behavioral guidance
- Repeating the same instruction in multiple places
---
## Tool Context Design
Tools allow agents to pull in new context at runtime. Because tools define the contract between agents and their information/action space, they must:
- Return token-efficient output (summaries, not raw dumps)
- Encourage efficient agent behaviors (don't make the agent call 5 tools when 1 would do)
- Be self-contained and robust to error
- Have minimal overlap with other tools
**One of the most common failure modes:** Bloated tool sets that cover too much functionality or lead to ambiguous decision points. If a human can't definitively say which tool to use, the agent can't either.
---
## Few-Shot Prompting
Few-shot examples are "pictures worth a thousand words." They show the agent what good looks like better than any instruction.
**Best practices:**
- Curate diverse, canonical examples — not a laundry list of edge cases
- Examples should portray the full range of expected behavior
- Don't stuff every edge case into examples — pick the ones that best represent the pattern
- For complex agents, 3-5 high-quality examples outperform 20 mediocre ones
---
## Just-in-Time Context Retrieval
Rather than loading all relevant data upfront, agents should maintain lightweight identifiers (file paths, stored queries, web links) and dynamically load data at runtime using tools.
**Why this works:**
- Mirrors human cognition — we don't memorize entire corpuses, we index and retrieve
- Keeps context lean and focused
- Enables progressive disclosure — agents discover relevant context through exploration
- Avoids stale pre-computed data
**The hybrid approach:** Retrieve some data upfront for speed, pursue further autonomous exploration at the agent's discretion. The right balance depends on the task.
**Example (Claude Code pattern):**
- CLAUDE.md files dropped into context upfront (stable, always relevant)
- glob and grep used to navigate and retrieve files just-in-time (dynamic, task-specific)
---
## Context Retrieval Decision Guide
| Situation | Strategy |
|---|---|
| Data is stable and always relevant | Load upfront in system prompt |
| Data is dynamic or task-specific | Just-in-time retrieval via tools |
| Data is large but partially relevant | Index + retrieve relevant chunks via RAG |
| Agent needs to remember across sessions | Structured note-taking / external memory |
| Task exceeds context window | Compaction or sub-agent architecture |
