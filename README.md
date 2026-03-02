# AI OS — Personal AI Operating System

A personal AI operating system built with Next.js 15, Mastra, and TypeScript. It orchestrates agents for email, calendar, research, LinkedIn, Instagram, content creation, and browser automation — all with long-term memory and a unified interface (Telegram, web chat).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Entry Points                                     │
│  Telegram Bot  │  Web Chat  │  Instagram Webhook  │  Cron (Morning Brief) │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Semantic Router (Intent → Agent)                      │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
┌─────────────────┐    ┌─────────────────────────┐    ┌─────────────────┐
│  Orchestrator    │    │  Specialized Agents     │    │  Workflows       │
│  (default)       │    │  email, research,       │    │  morning brief   │
│                  │    │  linkedin, content,     │    │  outreach        │
│  mem0 recall/    │    │  instagram, browser     │    │                 │
│  memorize        │    │                         │    │                 │
└─────────────────┘    └─────────────────────────┘    └─────────────────┘
          │                           │                           │
          └───────────────────────────┼───────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Services: Gmail, Calendar, Search, LinkedIn, Instagram, Browser, Nango   │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Memory (Mem0)  │  DB (Drizzle/Turso)  │  Qdrant (Skills)               │
└─────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm or npm

### Environment Setup

Copy `.env.example` to `.env` and fill in:

```bash
# Required for core
ANTHROPIC_API_KEY=
DATABASE_URL=                    # or TURSO_DATABASE_URL + TURSO_AUTH_TOKEN

# Optional integrations
TELEGRAM_BOT_TOKEN=              # Telegram bot
TELEGRAM_OWNER_ID=               # Your Telegram user ID
OPENAI_API_KEY=                  # For embeddings (routing, skills)
MEM0_API_KEY=                   # Long-term memory
TAVILY_API_KEY=                 # Web search (fast)
EXA_API_KEY=                    # Web search (deep)
LINKEDAPI_KEY=                  # LinkedIn (linkedapi.io)
IG_PAGE_ACCESS_TOKEN=            # Instagram (Meta Graph API)
META_APP_SECRET=                 # Instagram webhook verification
META_VERIFY_TOKEN=               # Instagram webhook verification
NANGO_SECRET_KEY=               # OAuth (Gmail, Calendar)
```

### Dev Commands

```bash
pnpm install
pnpm dev          # Start Next.js dev server
pnpm build        # Production build
pnpm db:migrate   # Run DB migrations
```

## Adding a New Skill

Create a `SKILL.md` file in `skills/<skillName>/`:

```markdown
---
id: my-skill
name: My Skill
---

# Skill: My Skill

## Description
What this skill does and when it applies.

## Triggers
- "trigger phrase 1"
- "trigger phrase 2"

## Examples
**Query:** "example user message"
**Action:** What the agent should do

## Constraints
- Constraint 1
- Constraint 2
```

Skills are loaded at runtime and injected into the orchestrator context when relevant.

## Integrations

### Telegram

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_OWNER_ID`
3. Set webhook: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<YOUR_URL>/api/telegram`

### Gmail & Google Calendar

1. Configure Nango at [nango.dev](https://nango.dev)
2. Set `NANGO_SECRET_KEY` and `NEXT_PUBLIC_NANGO_PUBLIC_KEY`
3. Connect Gmail and Calendar via Nango dashboard

### LinkedIn

1. Sign up at [linkedapi.io](https://app.linkedapi.io)
2. Set `LINKEDAPI_KEY` in env

### Instagram

1. Create a Meta app at [developers.facebook.com](https://developers.facebook.com)
2. Add Instagram Messaging product, connect your Instagram Business account
3. Set `IG_PAGE_ACCESS_TOKEN` (Page access token with `instagram_manage_messages`)
4. Set `META_APP_SECRET` and `META_VERIFY_TOKEN` for webhook verification
5. Subscribe to webhooks: `https://<YOUR_URL>/api/instagram/webhook`
6. Subscribe to `messages` field for Instagram

### Browser (Playwright)

```bash
npx playwright install chromium
```

## Phase Overview

| Phase | Scope |
|-------|-------|
| **Core** | Orchestrator, routing, memory, Telegram, web chat |
| **Email** | Gmail read/send/reply via Nango |
| **Calendar** | Google Calendar list/create via Nango |
| **Research** | Web search (Tavily, Exa), synthesis |
| **LinkedIn** | Profile research, DM, search (linkedapi.io) |
| **Content** | LinkedIn posts, newsletters, brand voice |
| **Instagram** | DM send, webhook for incoming messages |
| **Browser** | Navigate, extract content, fill forms (Playwright) |
| **Workflows** | Morning brief, outreach campaigns |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 |
| AI / Agents | Mastra, Anthropic Claude |
| Memory | Mem0 |
| Search | Tavily, Exa |
| DB | Drizzle + Turso/Neon |
| OAuth | Nango |
| Messaging | Telegram, Instagram (Meta Graph API) |
| Browser | Playwright |
| Skills | Qdrant (embeddings) |
