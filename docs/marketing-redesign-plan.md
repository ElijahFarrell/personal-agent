# Shiloh AI — Marketing Site Redesign Plan (Consulting-First, Cross-Industry)

Design and structure spec for the marketing site pivot. **This is a plan, not an implementation.**
The implementing agent should read this top to bottom, then `CONTEXT.md` (domain glossary — the
language here must stay consistent with it), then the existing code under `src/app/marketing/`
and `src/components/marketing/`.

---

## 1. What changes and why

The current homepage sells one vertical product (pre-op/post-op calling for surgery centers).
The business is pivoting to **engineering-led AI consulting across industries**: audit → build →
train → hand off. The site's job changes from "convince a skeptical ASC administrator to book a
call" to "convince a skeptical SMB founder/operator that Shiloh ships real AI systems, and get
them into the Free AI Audit."

Conversion model (unchanged from `CONTEXT.md`):

- **Primary conversion:** complete the Free AI Audit (`/audit`, guided questionnaire → personalized report)
- **Secondary conversion:** book a strategy call (external calendar)
- **Supporting:** on-site AI chat (reskin only, no funnel changes)

Positioning line (source of truth for all hero/meta copy):

> Software engineer (Amazon, Microsoft) who helps businesses find and implement high-ROI AI
> workflows — from audit to production. Fixed-fee engagements. Production systems, not pilots that die.

Non-goals: no new audit funnel logic, no chat behavior changes, no dashboard/app changes,
no new backend. This is a marketing-surface redesign.

---

## 2. Design direction — "Warm Editorial Studio"

The visual identity should read as a **boutique advisory studio run by an engineer**, not a SaaS
startup and not an "AI agency." Reference feel: Anthropic's minimalist authority + a high-end
independent consultancy (think editorial magazine meets engineering notebook). The research brief
in Notion is explicit: the best AI sites don't try to *look* like AI — they make AI feel clear,
credible, and valuable. Restraint reads as competence.

### 2.1 Color system

Replace the teal healthcare palette in `src/styles/marketing-theme.css` (scoped under
`.marketing-site`, so the app dashboard is untouched). Token swap, same variable names:

| Token | Value (HSL) | Usage |
|---|---|---|
| `--background` | `36 33% 97%` (warm cream, ~#FAF7F2) | Page surfaces |
| `--foreground` | `24 12% 13%` (warm charcoal) | Body text |
| `--card` | `40 30% 99%` | Cards, slightly lighter than bg |
| `--primary` / `--brand-500` | `16 62% 47%` (terracotta, ~#C4502E) | CTAs, key links, badges — the ONLY saturated color |
| `--brand-600` | `16 65% 41%` | CTA hover |
| `--brand-100` | `20 45% 92%` | Terracotta tint surfaces (badges, callouts) |
| `--secondary` | `36 20% 92%` | Secondary buttons, muted panels |
| `--muted-foreground` | `24 8% 42%` | Captions, eyebrows |
| `--border` | `30 15% 86%` | Hairline rules |
| Success accent (sparing) | `150 30% 35%` (deep sage) | Metric deltas only, never CTAs |

Fill out the full `--brand-50..900` ramp around the terracotta hue. Keep `--destructive` as is.
Rule: terracotta appears on at most ~3 elements per viewport (primary CTA, one link, one badge).
Everything else is cream/charcoal/hairline. That's what makes the CTA impossible to miss
(attention ratio ~1:1 per the research doc).

Keep the existing `.marketing-paper-grain` noise overlay — it suits the editorial paper feel.
Retire the glass/backdrop-blur treatment on marketing surfaces; flat warm cards with hairline
borders and a single soft ambient shadow read more "advisory," less "dashboard."

### 2.2 Typography

The fonts are already right and already loaded in `src/app/marketing/layout.tsx`:

- **Newsreader (serif)** — display: H1/H2, pull quotes, case-study titles, big metric numbers.
  Use optical sizing, tight leading (~1.05 on H1), regular weight at large sizes (light serif at
  72px looks expensive; bold serif looks dated).
- **Figtree (sans)** — everything else: body, nav, buttons, forms.
- **Geist Mono (already in the app)** — small technical accents: eyebrow labels
  (`AUDIT → BUILD → TRAIN`), metric captions, tags like `RAG`, `VOICE`, `AGENTS`. This is the
  "engineer's fingerprint" on an otherwise editorial page. Use sparingly.

Type scale (desktop → mobile): H1 64/40, H2 40/30, H3 24/20, body 17/16, caption 13.
Max text measure ~65ch. Generous whitespace between sections (~128px desktop / 80px mobile).

### 2.3 Imagery & artifacts (show, don't tell)

No stock photos, no "AI brain" art, no abstract gradients. Every visual is a **real artifact of
the work**:

1. **Audit report preview** — a stylized (real data, mock client name) page of the audit report
   the visitor gets. This is the hero artifact (see §4.1).
2. **Annotated workflow diagrams** — before/after workflow sketches for case studies. Style:
   thin charcoal line-art on cream, terracotta annotations, hand-drawn-adjacent (like a
   consultant's whiteboard, cleaned up). One consistent illustration system across the site.
3. **System architecture cards** — small mono-labeled block diagrams (Docs → Ingest → RAG → Draft)
   for services pages.
4. **Founder photo** — one real photo, warm-toned, in the founder section only.

### 2.4 Motion

Purposeful and minimal: fade-up-on-scroll for section reveals (60ms stagger), a subtle
count-up on the outcomes metric strip, and one signature moment — the hero audit-report artifact
gently "assembling" (rows fading in sequentially) on load. Respect `prefers-reduced-motion`.
Keep the existing marquee util if logos/testimonials scroll. Nothing else moves.

---

## 3. Site architecture

### 3.1 Sitemap

```
/                    Home — conversion page (audit-led)
/services            The 5 capability offers (anchor-linked sections)
/work                Case studies index (NEW — replaces /industries as the proof surface)
/work/[slug]         Individual case study pages (NEW)
/audit               Free AI Audit funnel (exists — reskin only)
/pricing             Offer ladder + engagement table (rework copy)
/about               Founder story + how engagements run (rework)
/blog                Exists — keep, retheme
/privacy /terms      Keep
```

Route changes:

- **Add `/work` + `/work/[slug]`.** Case studies are the single most valuable asset for a
  consultancy; they deserve first-class routes, not a paragraph on the homepage.
- **Retire `/industries` and `/real-estate` as top-level pages.** Fold their content into
  `/work` entries (real estate becomes a case study; the ASC page becomes the
  "Surgery center voice agent" case study). 301-redirect old URLs to the corresponding
  `/work/[slug]` pages in `next.config.ts`.
- **Delete the empty `/features` directory.**
- The current ASC homepage sections move to `/work/surgery-center-voice-agent` (compressed),
  not deleted — it's proof of voice + compliance capability, it just no longer leads the pitch.

### 3.2 Navigation

Navbar (5 items max): `Services · Work · Pricing · About` + terracotta button **"Get your free AI audit"**.
Blog lives in the footer. Sticky nav, cream with hairline bottom border on scroll.
Mobile: sheet menu, CTA pinned at the bottom of the sheet.

Footer: 3 columns — (1) wordmark + one-liner + "Built by an engineer, not an agency" tag,
(2) sitemap links + blog, (3) CTA block repeating the audit button. Plus legal row.

---

## 4. Homepage blueprint (section by section)

Medium-length conversion page per `CONTEXT.md`. Order:
hero → outcomes proof → how engagements run → services teaser → featured case study →
testimonials → founder → FAQ → final CTA.

### 4.1 Hero (audit-led, outcome-first)

- **Eyebrow (mono):** `AI CONSULTING — AUDIT → BUILD → TRAIN`
- **H1 (serif, 2 lines max):** "Find out where AI actually saves your business time and money."
  - Alt options: "Ship the AI system your business actually needs." / "AI that pays for itself — found, built, and shipped."
- **Subhead:** "Take the free AI audit: answer a few questions about how your team works, get a
  personalized report of your highest-ROI automation opportunities — then, if it makes sense,
  I build it with you."
- **Primary CTA (terracotta):** "Start the free AI audit" → `/audit`
- **Secondary CTA (ghost):** "Book a strategy call" → calendar link
- **Trust line (small, under CTAs):** "Software engineer at Amazon, ex-Microsoft · systems shipped
  across nonprofits, real estate, education & finance"
- **Hero artifact (right side desktop / below on mobile):** the stylized audit-report preview —
  a paper-like card showing "Automation opportunities: 3 found · Est. time saved: 11 hrs/week ·
  Priority: grant drafting workflow" with rows assembling on load. This *is* the product demo
  for a consulting site: it shows the deliverable, not a metaphor.

No enterprise-résumé flexing in the hero (per `CONTEXT.md` — founder credibility stays compact
and below the fold).

### 4.2 Outcomes proof strip

Full-width band, 3–4 big serif numbers with mono captions. Client results, not vanity metrics:

- **10+ hrs** saved per grant submission
- **~$13K/mo** added client revenue
- **25%** more grant submissions per month
- **$500+/mo** cut from a client's CRM spend

Caption under the strip: "Real numbers from shipped client systems — details in the case studies."
Each stat deep-links to its `/work/[slug]` page.

### 4.3 How engagements run (3 steps)

Compact horizontal timeline (numbered 01/02/03 in mono):

1. **Audit (1–2 weeks)** — "We map your workflows and find the highest-ROI opportunity. You get a
   prioritized roadmap with honest build-vs-buy calls — even if the answer is 'don't build anything yet.'"
2. **Build (4–8 weeks)** — "Fixed-fee implementation of one system, integrated with your stack.
   You see working software weekly, not a deck at the end."
3. **Train & hand off** — "Your team learns to run it. Optional advisory retainer if you want a
   fractional AI lead on call."

### 4.4 Services teaser

One row of 5 compact cards (title + one-line outcome + mono tag), linking to `/services` anchors:
AI Readiness Audit · Knowledge Base / RAG · Workflow Automation & Agents · Voice AI ·
Fractional AI Advisory. No pricing here; pricing lives on `/pricing` and `/services`.

### 4.5 Featured case study (the centerpiece)

One case study told properly, editorial layout (this is the section that separates the site from
every AI-agency template): the nonprofit grant-writing automation.

- Left: narrative — problem ("50+ page grant documents, 10+ hours per submission"),
  what was built (agentic RAG drafting pipeline), before/after workflow diagram.
- Right: outcome card — the three big numbers + the Cyborg Mobile testimonial pull quote (serif, large).
- CTA link: "Read the full case study →" and "See all work →"

### 4.6 Testimonials

The Cyborg Mobile testimonial (named, attributable) as the anchor quote; add others as they land.
One large editorial quote beats a 3-card testimonial wall — don't fake volume we don't have.

### 4.7 Founder section (compact)

Photo + short bio: "I'm Elijah — a software engineer at Amazon, previously Microsoft, where I
shipped production ML in Teams. Outside big tech I've built AI systems for nonprofits, real
estate firms, education programs, and financial advisors. I don't sell strategy decks — I audit,
build, train, and hand off." Mono strip of credibility tags: `AMAZON` `MICROSOFT` `10+ SYSTEMS SHIPPED`.

### 4.8 FAQ

Reuse `FAQSection` component with new items: "What does the audit actually include?" /
"Do you only work with [industry]?" (answer: capability-based, industries listed) /
"What if we already tried AI and it flopped?" / "How are you different from an automation
agency?" / "What do you need from us to start?" / "Do you work fixed-fee or hourly?" (fixed-fee).

### 4.9 Final CTA

Full-width warm band, serif headline "Find your highest-ROI AI opportunity." + audit button +
"or book a 15-minute strategy call." Repeat the primary action, nothing new.

---

## 5. Secondary pages

### 5.1 `/services`

Intro: "Sold by capability, not by industry — the audit is the same everywhere; the build fits
your business." Then 5 full sections (anchor targets), each with: outcome-led title, who it's
for, what's delivered, a small mono architecture diagram, price range, proof link to a related
case study, and an audit CTA.

| Offer | Price on page | Proof link |
|---|---|---|
| AI Readiness Audit | $2,500–$5,000 · 1–2 weeks | Amazon audit pattern |
| Knowledge Base / RAG systems | $5,000–$15,000 | Education RAG tutor |
| Workflow automation / agentic systems | $8,000–$25,000 | Grant automation |
| Voice AI agents | $5,000–$15,000 + optional $500–$1,500/mo | RE lead reactivation, ASC |
| Fractional AI advisory | $2,000–$5,000/mo | — |

### 5.2 `/work` + `/work/[slug]` (new)

Index: editorial grid (large cards, alternating layout), each card = client type, one-line
outcome, key metric, capability tags (mono chips). Filterable by capability tag is a
nice-to-have, not required for v1.

Case study entries (from Notion "Past Experiences" — verify numbers with the founder before publishing):

1. `grant-writing-automation` — Nonprofit · agentic RAG drafting · 10+ hrs saved/submission, 25% more submissions, ~$13K/mo revenue lift · testimonial
2. `education-rag-tutor` — University course + internship program bots · 24/7 student self-service
3. `real-estate-crm-and-voice` — CRM migration ($500+/mo saved) + voice lead-reactivation agent ($8K–$50K revenue potential)
4. `financial-services-lead-bot` — Wealth group website chatbot · lead capture + CRM form integration
5. `surgery-center-voice-agent` — Pre/post-op calling agent · voice + compliance proof (compressed from current homepage; keep HIPAA/BAA content)
6. `amazon-ai-audit` — internal, anonymized · the audit framework story (stakeholder interviews → prioritized roadmap → POC)

Case study page template: hero (client type + outcome headline + metric strip) → "The problem" →
"What we built" (workflow diagram + architecture card) → "The results" (numbers + quote) →
"Related service" cross-link → audit CTA. Consistent template = new case studies become a
content-drop, not a design project.

### 5.3 `/pricing`

Lead with the offer ladder as a horizontal diagram: `Free fit call → AI Audit ($2.5–5K) →
Implementation ($8–25K) → Retainer ($2–5K/mo)`. Then the engagement table (audit / single
workflow / multi-workflow / training workshop / advisory) with fixed-fee ranges. Explicit
principle stated on page: "Fixed fees, always. You'll never get an hourly surprise."
FAQ for payment/scope questions. Audit CTA.

### 5.4 `/about`

Founder story (the 2.5 GPA → Microsoft → Amazon arc is genuinely good narrative — use it,
aimed at operators not students), the engagement philosophy ("consulting-first: production
systems, not slide decks"), and values. Keep it one screen-and-a-half; this page supports trust
after interest, it doesn't need to convert on its own.

### 5.5 `/audit`

Reskin only (per `CONTEXT.md`): terracotta accents, cream surfaces, serif step headings in the
wizard, restyled radio cards and report dashboard. No question/logic/funnel changes.

### 5.6 `/blog`

Retheme to editorial (serif titles, generous measure). Content strategy (for later, not the
redesign): posts mirror the consulting content lane — before/afters, architecture decisions,
"what a $3,500 audit looks like."

---

## 6. Reuse vs. rebuild map

| Existing asset | Disposition |
|---|---|
| `marketing-theme.css` | Retoken (teal → terracotta/cream), keep scoping + grain, drop glass |
| `MarketingNavbar` / `MarketingFooter` / `MarketingBackground` | Keep structure, restyle + new links |
| `FAQSection`, `Testimonials`, `MetricsBar`, `ProcessSteps`, `FounderSection`, `PricingCards` | Reuse with new copy/styling |
| `ChatWidget` | Visual reskin only |
| `audit/*` components | Visual reskin only |
| `asc/*` components + `asc-copy.ts` | Move/compress into `/work/surgery-center-voice-agent`; homepage stops importing them |
| `AgentShowcase`, `PlatformCapabilities`, `ComparisonTable`, `DeliveryModels`, `HomeServicesTeaser` | Audit case-by-case; platform-catalog content belongs on `/services` or gets cut (platform detail below the fold, per CONTEXT.md) |
| `StructuredData` | Update: swap `ascHealthcareServiceSchema` for a ProfessionalService/Consulting schema on home; keep the healthcare schema on the ASC case-study page |
| Copy files | New `consulting-copy.ts` (or split per page) alongside `asc-copy.ts`; all copy centralized as today, no hardcoded strings in components |

New components needed: `AuditReportArtifact` (hero), `WorkflowDiagram` (illustration system),
`CaseStudyCard` / case-study page template, `OfferLadder` (pricing diagram), `CapabilityCard`.

---

## 7. Conversion & quality checklist (from the research brief)

- One primary CTA per page ("Start the free AI audit"), high-contrast terracotta, repeated at
  hero + final band. Attention ratio ≈ 1:1.
- Outcome-driven H1; benefits over features everywhere; named proof only (no "a satisfied client").
- Mobile-first (79%+ of B2B SaaS traffic is mobile): tap-size CTAs, artifact stacks under hero
  copy, no horizontal-scroll tables (case-study metrics become stacked cards on mobile).
- Speed: LCP < 2.5s. Hero artifact is DOM/SVG, not a big image; fonts already `display: swap`;
  no heavy animation libraries — CSS transitions + IntersectionObserver are enough.
- Forms: minimum fields (the audit intake already handles qualification).
- SEO: update `siteMeta`, per-page metadata, sitemap entries for `/work/*`, redirects for
  retired routes.
- Accessibility: keep skip-link, focus-visible styles (retoken to terracotta), semantic
  headings, reduced-motion support.

## 8. Suggested implementation order

1. Theme retoken + nav/footer (whole site instantly feels new)
2. New homepage (sections §4) with new copy file
3. `/work` index + case-study template + migrate ASC/RE content, redirects
4. `/services` + `/pricing` rework
5. `/about` + `/audit` + `/blog` reskin
6. Structured data, metadata, QA pass (mobile, LCP, reduced motion)

Ship 1–2 as one PR; each later step is independently shippable.
