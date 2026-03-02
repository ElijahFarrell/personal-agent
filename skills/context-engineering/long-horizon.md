# Long-Horizon Task Techniques
## The Problem
Long-horizon tasks require agents to maintain coherence, context, and goal-directed behavior over sequences of actions where the token count approaches or exceeds the context window. Without intervention, agents lose track of earlier decisions, repeat work, or drift from the original goal.
Three techniques address this: compaction, structured note-taking, and sub-agent architectures.
---
## Technique 1: Compaction
**What it is:** Take a conversation nearing the context window limit, summarize its contents, and reinitiate a new context window with the summary.
**When to use:** Tasks with extensive back-and-forth that need conversational continuity.
**How to implement:**
1. Monitor token count. When approaching the limit, trigger compaction.
2. Pass the full message history to the model with a compaction prompt.
3. The model preserves: architectural decisions, unresolved issues, implementation details, key findings.
4. The model discards: redundant tool outputs, repeated messages, resolved intermediate steps.
5. Reinitiate with the compressed summary + the 5 most recently accessed files.
**The art of compaction:** Maximize recall first (capture everything relevant), then iterate to improve precision (eliminate superfluous content). Overly aggressive compaction loses subtle but critical context.
**Lightest-touch compaction:** Clear tool call results from deep in message history. Once a tool has been called and its result used, the raw result rarely needs to stay in context.
---
## Technique 2: Structured Note-Taking (Agentic Memory)
**What it is:** The agent regularly writes notes persisted to memory outside the context window. Notes are pulled back into context at later times as needed.
**When to use:** Iterative development with clear milestones. Tasks where the agent needs to track progress across many steps.
**How to implement:**
- Give the agent a `write_note` tool that persists to a NOTES.md file or external memory store
- Give the agent a `read_notes` tool to retrieve notes at the start of each session
- Instruct the agent to update notes at key milestones: decisions made, problems encountered, next steps
**What to track in notes:**
- Current task and sub-tasks
- Decisions made and why
- Problems encountered and how they were resolved
- What has been completed
- What remains to be done
- Key dependencies or constraints
**Example (Claude Code pattern):** The agent maintains a to-do list and updates it after each significant action. After context resets, it reads its own notes and continues seamlessly.
---
## Technique 3: Sub-Agent Architectures
**What it is:** Rather than one agent maintaining state across an entire project, specialized sub-agents handle focused tasks with clean context windows. The main agent coordinates with a high-level plan while sub-agents perform deep technical work.
**When to use:** Complex research and analysis where parallel exploration pays dividends. Tasks that can be cleanly decomposed into specialized domains.
**How it works:**
- Main (orchestrator) agent holds the high-level plan and coordinates
- Sub-agents each get a focused task with a clean context window
- Sub-agents may use tens of thousands of tokens exploring their domain
- Sub-agents return a condensed summary (1,000-2,000 tokens) to the main agent
- Main agent synthesizes sub-agent outputs and continues
**Benefits:**
- Clear separation of concerns
- Detailed search context stays isolated within sub-agents
- Main agent stays focused on synthesis and analysis
- Enables parallel exploration
---
## Choosing the Right Technique
| Task Characteristic | Best Technique |
|---|---|
| Extensive back-and-forth, conversational | Compaction |
| Iterative development with clear milestones | Structured note-taking |
| Complex research with parallel exploration | Sub-agent architecture |
| All of the above | Combine all three |
---
## The Golden Rule
Even as models improve and context windows grow larger, context pollution and information relevance concerns will remain. Treating context as a precious, finite resource will always be central to building reliable, effective agents.
