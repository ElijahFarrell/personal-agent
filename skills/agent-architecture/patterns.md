# Agent Architecture Patterns
## Pattern 1: Prompt Chaining
**What it is:** Decompose a task into a sequence of steps where each LLM call processes the output of the previous one.
**When to use:**
- Task can be cleanly decomposed into fixed subtasks
- You want to trade latency for higher accuracy
- Each step is an easier, more focused task
**Examples:**
- Generate marketing copy → translate into another language
- Write an outline → check outline meets criteria → write document from outline
- Research a topic → extract key points → write a summary → format for LinkedIn
**Implementation note:** Add programmatic checks ("gates") between steps to verify the process is on track before proceeding.
---
## Pattern 2: Routing
**What it is:** Classify an input and direct it to a specialized follow-up task or prompt.
**When to use:**
- Complex tasks with distinct categories better handled separately
- When optimizing for one input type would hurt performance on others
- When you want to route to different models based on complexity/cost
**Examples:**
- Customer service: route general questions → refund requests → technical support into different prompts
- Route easy/common questions to Claude Haiku (fast, cheap) and hard questions to Claude Sonnet (capable)
- Route outreach responses to different handling scripts (enthusiastic vs cautious vs objection)
**Implementation note:** Classification can be done by an LLM or a traditional classifier. Test classification accuracy before relying on it.
---
## Pattern 3: Parallelization
**What it is:** Run subtasks simultaneously and aggregate outputs programmatically.
**Two variations:**
- **Sectioning:** Break task into independent subtasks run in parallel
- **Voting:** Run the same task multiple times for diverse outputs or higher confidence
**When to use:**
- Subtasks can be parallelized for speed
- Multiple perspectives or attempts are needed for higher confidence
- Complex tasks where each consideration benefits from focused attention
**Examples (Sectioning):**
- One model processes user query while another screens for inappropriate content
- Evaluate different aspects of LLM performance in parallel
**Examples (Voting):**
- Review code for vulnerabilities with several different prompts
- Evaluate whether content is appropriate with multiple prompts requiring different vote thresholds
---
## Pattern 4: Orchestrator-Workers
**What it is:** A central LLM dynamically breaks down tasks, delegates to worker LLMs, and synthesizes results.
**When to use:**
- Complex tasks where you can't predict the subtasks needed upfront
- The number and nature of subtasks depends on the specific input
- You need flexibility that parallelization (with pre-defined subtasks) can't provide
**Examples:**
- Coding products that make complex changes to multiple files
- Search tasks gathering and analyzing information from multiple sources
- Multi-agent marketing team: orchestrator delegates to content agent, SEO agent, social agent
**Key difference from parallelization:** Subtasks aren't pre-defined — the orchestrator determines them based on the specific input.
---
## Pattern 5: Evaluator-Optimizer
**What it is:** One LLM generates a response while another evaluates and provides feedback in a loop.
**When to use:**
- Clear evaluation criteria exist
- Iterative refinement provides measurable value
- LLM responses can be demonstrably improved when feedback is given
**Examples:**
- Literary translation where nuances need critique and revision
- Complex search tasks requiring multiple rounds of searching and analysis
- Content generation where quality can be objectively measured
**Implementation note:** The two signs of good fit: (1) LLM responses improve when a human articulates feedback, and (2) the LLM can provide that feedback itself.
---
## Pattern 6: Full Agents (Looping Tools)
**What it is:** LLMs autonomously using tools in a loop based on environmental feedback.
**When to use:**
- Open-ended problems where the number of steps can't be predicted
- Tasks requiring flexibility and model-driven decision-making at scale
- Trusted environments where agent autonomy is acceptable
**Examples:**
- Coding agent resolving GitHub issues across multiple files
- Research agent that searches, reads, synthesizes, and iterates
- Customer support agent with access to CRM, order history, and action tools
**Warning:** Higher costs, potential for compounding errors. Test extensively in sandboxed environments. Add stopping conditions (max iterations).
---
## Pattern Selection Guide
| Task Type | Best Pattern |
|---|---|
| Fixed, sequential steps | Prompt Chaining |
| Different input types needing different handling | Routing |
| Independent subtasks that can run simultaneously | Parallelization |
| Complex task with unpredictable subtasks | Orchestrator-Workers |
| Iterative refinement with clear quality criteria | Evaluator-Optimizer |
| Open-ended, multi-step, unpredictable | Full Agent |
