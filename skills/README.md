# Skills Library
> Packaged procedural knowledge for AI agents. Each skill is a folder with a SKILL.md entry point and bundled supporting files. Agents discover skills via their name and description, then load the full content dynamically when needed.
## How Skills Work
1. Agent reads the `name` and `description` from each SKILL.md at startup
2. When a task matches a skill's description, the agent loads the full SKILL.md
3. The agent then loads any referenced bundled files (frameworks.md, templates, etc.)
4. The agent executes the task using the loaded procedural knowledge
This is progressive disclosure — skills load only what's needed, keeping context lean.
---
## Skill Index
### 1. `copywriting/`
**Trigger:** Writing LinkedIn posts, newsletters, outreach messages, sales copy, hooks, or any persuasive content.
**Files:**
- `SKILL.md` — Entry point, writing process, quality checklist
- `frameworks.md` — Pyramid Principle, P&P Framework, PASTOR, PAS, BAB, AIDA + selection guide
- `hooks.md` — 7 hook formula categories, length rules, testing checklist
**Source knowledge:** Dan Koe writing philosophy, Persuasive Writing Frameworks note, Kortex copywriting resources
---
### 2. `creator-outreach/`
**Trigger:** Reaching out to creators or prospects, writing DMs, handling responses, moving to booked calls.
**Files:**
- `SKILL.md` — Entry point, outreach philosophy, profile requirements, rate limits, 5-step sequence
- `dm-templates.md` — All message templates for every step (initial, follow-up, audit offer, Loom, call booking, objection handling)
- `follow-up.md` — Timing guide, follow-up philosophy, when to stop
**Source knowledge:** Outreach Response Types PDF (Monetise/IPGA)
---
### 3. `icp-qualification/`
**Trigger:** Evaluating whether a prospect fits the ICP, building target lists, defining who to pursue.
**Files:**
- `SKILL.md` — Entry point, qualification philosophy, the filter rule
- `checklist.md` — Full qualification checklist (Transformation, Audience, Engagement, Consistency, Budget)
- `questions.md` — 5 ICP definition questions to complete before any outreach campaign
**Source knowledge:** Understanding Your ICP PDF (Monetise/IPGA)
---
### 4. `brand-voice/`
**Trigger:** Any content generation that needs to sound like the author — not generic AI.
**Files:**
- `SKILL.md` — Entry point, core identity, when to load
- `voice-guide.md` — Tone descriptors, language rules, the story arc, philosophical anchors, kingdom anchors, examples by format
**Source knowledge:** Vision note, Pride & Purpose note, Download 2/1/26, Ideas note
---
### 5. `ai-audit/`
**Trigger:** Conducting an AI opportunity audit, scoping a client engagement, identifying and prioritizing AI opportunities.
**Files:**
- `SKILL.md` — Entry point, audit philosophy, two-week process overview, deliverables, pricing
- `process.md` — Full methodology: stakeholder interview questions, Ops Canvas mapping, opportunity identification, solution design, ROI calculation
- `opportunity-matrix.md` — Impact vs. Effort matrix, prioritization order, example opportunities by quadrant, ROI calculation template
**Source knowledge:** AI Audit Guide $10k PDF (Liam Ottley / Morningside AI)
---
### 6. `agent-architecture/`
**Trigger:** Designing AI agents, choosing architectural patterns, building tools, debugging agent failures.
**Files:**
- `SKILL.md` — Entry point, core principles, key definitions, decision rule
- `patterns.md` — All 6 patterns: Prompt Chaining, Routing, Parallelization, Orchestrator-Workers, Evaluator-Optimizer, Full Agents — with when-to-use and examples
- `tool-design.md` — ACI best practices, tool documentation standards, common mistakes, testing guide
**Source knowledge:** Building Effective AI Agents (Anthropic), Building Agents canvas
---
### 7. `context-engineering/`
**Trigger:** Designing system prompts, managing agent memory, handling long-horizon tasks, debugging context-related failures.
**Files:**
- `SKILL.md` — Entry point, core definition, context rot concept, component hierarchy
- `principles.md` — System prompt design (right altitude, structure, minimalism), tool context, few-shot prompting, just-in-time retrieval
- `long-horizon.md` — Compaction, structured note-taking, sub-agent architectures — with implementation guidance
**Source knowledge:** Effective Context Engineering for AI Agents (Anthropic)
---
### 8. `mindset/`
**Trigger:** Generating motivational or philosophical content, writing from a kingdom perspective, overcoming resistance, aligning decisions with core values.
**Files:**
- `SKILL.md` — Entry point, core identity, Learn-Build-Create cycle
- `dan-koe-principles.md` — Verbatim principles on focus, clarity, discipline, passion, mastery, resilience, and the good life
- `kingdom-anchors.md` — Faith anchors, scripture references, the Year of Dominion, the North Star question, on wealth and righteousness
**Source knowledge:** Dan Koe notes, Vision note, Pride & Purpose note, Download 2/1/26, Ideas note
---
## Usage in Code
```python
import os
from pathlib import Path
SKILLS_DIR = Path("skills/")
def load_skill(skill_name: str) -> str:
    skill_path = SKILLS_DIR / skill_name / "SKILL.md"
    return skill_path.read_text()
def load_skill_file(skill_name: str, filename: str) -> str:
    file_path = SKILLS_DIR / skill_name / filename
    return file_path.read_text()
def get_all_skill_metadata() -> list[dict]:
    skills = []
    for skill_dir in SKILLS_DIR.iterdir():
        if skill_dir.is_dir():
            skill_md = skill_dir / "SKILL.md"
            if skill_md.exists():
                content = skill_md.read_text()
                skills.append({
                    "name": skill_dir.name,
                    "path": str(skill_md),
                    "content": content
                })
    return skills
```
## Adding New Skills
1. Create a new folder under `skills/` with the skill name
2. Create `SKILL.md` with YAML frontmatter (`name` and `description`)
3. Add bundled files referenced in SKILL.md
4. Add the skill to this README index
5. Test: give the agent a task that should trigger the skill and verify it loads correctly
