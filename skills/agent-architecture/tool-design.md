# Tool Design & Agent-Computer Interface (ACI)
## The Core Principle
Think about how much effort goes into human-computer interfaces (HCI) — and invest just as much effort into creating good agent-computer interfaces (ACI). Tools are the contract between your agent and its environment. Bad tools = bad agents, regardless of model quality.
When building the SWE-bench agent, Anthropic spent more time optimizing tools than the overall prompt.
## Tool Design Checklist
- [ ] Is it obvious how to use this tool from its description and parameters alone?
- [ ] Are parameter names descriptive and unambiguous?
- [ ] Does the tool have a single, clear responsibility?
- [ ] Is there minimal overlap with other tools in the set?
- [ ] Does the tool return token-efficient output?
- [ ] Is the tool robust to common errors?
- [ ] Does the tool include example usage in its documentation?
- [ ] Are edge cases and input format requirements documented?
## Tool Documentation Standards
Every tool must have:
1. **Name** — clear, action-oriented (e.g., `search_web`, `read_file`, `send_email`)
2. **Description** — when to use this tool, what it does, what it returns
3. **Parameters** — each parameter with type, description, and whether required
4. **Example usage** — at least one concrete example
5. **Edge cases** — what happens with empty input, invalid format, etc.
**Example of good tool documentation:**
```python
def search_web(query: str, num_results: int = 5) -> list[dict]:
    """
    Search the web for information on a given topic.
    Use this tool when you need current information not in your training data,
    or when you need to verify a specific fact.
    Returns a list of results with 'title', 'url', and 'snippet' fields.
    Example: search_web("Claude Code agent skills tutorial", num_results=3)
    Do NOT use for: searching internal documents (use search_knowledge_base instead).
    """
```
## Common Tool Design Mistakes
### Mistake 1: Ambiguous tool selection
If a human engineer can't definitively say which tool to use in a given situation, the agent can't either. Eliminate overlap between tools.
**Bad:** `get_info()` and `fetch_data()` that do similar things
**Good:** `search_web()` for external info, `search_knowledge_base()` for internal docs
### Mistake 2: Relative file paths
Agents that move between directories will fail with relative paths.
**Fix:** Always require absolute file paths in file-related tools.
### Mistake 3: Bloated tool sets
Too many tools = ambiguous decision points = agent confusion.
**Fix:** Start with the minimum viable set of tools. Add only when demonstrably needed.
### Mistake 4: Token-inefficient returns
Tools that return massive amounts of data bloat the context window.
**Fix:** Return only what the agent needs. Use pagination. Return summaries, not raw dumps.
### Mistake 5: No error handling
Agents that hit tool errors without graceful handling will spiral.
**Fix:** Every tool should return a clear error message when it fails, not an exception.
## Tool Format Guidelines
- Give the model enough tokens to "think" before writing itself into a corner
- Keep format close to what the model has seen naturally in text (markdown > JSON for code)
- Avoid formatting overhead (don't require the model to count lines or escape strings)
- Use Poka-yoke design — make it hard to use the tool incorrectly
## Testing Your Tools
1. Run many example inputs in the workbench to see what mistakes the model makes
2. Test edge cases: empty input, malformed input, very long input
3. Test tool selection: given a task, does the model choose the right tool?
4. Iterate on descriptions and parameter names based on observed failures
