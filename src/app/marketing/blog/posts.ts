export type BlogBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: readonly string[] }

export type BlogPostMeta = {
  slug: string
  title: string
  description: string
  date: string
  author: string
  blocks: readonly BlogBlock[]
}

export const BLOG_POSTS: readonly BlogPostMeta[] = [
  {
    slug: 'ai-readiness-audit-process-cost',
    title: 'AI readiness audit: process, deliverables, and cost',
    description:
      'What the free diagnostic includes, how the paid AI Readiness Audit works, what you get, what it costs, and when you should not buy one.',
    date: '2026-09-10',
    author: 'Shiloh',
    blocks: [
      {
        type: 'p',
        text: 'Bottom line: the free audit is a five-minute automated report. The paid AI Readiness Audit is a 1–2 week, $2,500–$5,000 engagement that interviews stakeholders, ranks workflows by ROI, and tells you whether to build, buy, or wait. A production build is a separate fixed-fee project.',
      },
      {
        type: 'h2',
        text: 'Who this is for',
      },
      {
        type: 'p',
        text: 'Operators who own a repetitive, costly workflow and can change how it runs. You do not need an AI team. You do need process ownership and honest answers about tools, handoffs, and time.',
      },
      {
        type: 'h2',
        text: 'Free diagnostic vs paid readiness audit',
      },
      {
        type: 'p',
        text: 'The free diagnostic asks how your team works and emails a personalized report of likely opportunities, time-savings ranges, and a first action plan. It is not interviews, not a custom architecture, and not a commitment to build.',
      },
      {
        type: 'p',
        text: 'The paid readiness audit is the next step when the report points at a real workflow and you want a decision, not another slide. Shiloh maps the process, ranks the top three automatable opportunities, makes build-versus-buy calls, and writes a roadmap with timeline and cost. Sometimes the recommendation is “do not build yet.”',
      },
      {
        type: 'h2',
        text: 'Process',
      },
      {
        type: 'ul',
        items: [
          'Fit: 15-minute call if you want a human read on the free report — optional.',
          'Interviews: stakeholders who live in the workflow, not just the executive summary.',
          'Map: tools, handoffs, and the work that happens outside the system of record.',
          'Rank: top three opportunities by time, revenue, or cost — with an honest no-build option.',
          'Hand off: written roadmap you can take internally even if you never hire Shiloh to implement.',
        ],
      },
      {
        type: 'h2',
        text: 'Deliverables and cost',
      },
      {
        type: 'p',
        text: 'You receive a workflow map, ROI-ranked opportunities, build-versus-buy recommendations, and a prioritized roadmap. Price is $2,500–$5,000. Timeline is 1–2 weeks. Fees are fixed before kickoff.',
      },
      {
        type: 'p',
        text: 'If you later want a build, implementations are scoped separately — typically $5,000–$25,000 depending on one workflow versus a multi-agent system. Training and handoff are part of every build.',
      },
      {
        type: 'h2',
        text: 'Risks and when to skip it',
      },
      {
        type: 'ul',
        items: [
          'Skip the paid audit if you need a same-week custom build with no discovery — that is a different (and riskier) buy.',
          'Skip if you cannot share how the work actually happens. A roadmap without process access is guesswork.',
          'Treat vendor “AI strategy” decks without a ranked workflow as a different product. This audit exists to pick one system to ship or to stop.',
        ],
      },
      {
        type: 'h2',
        text: 'What a measured outcome looks like',
      },
      {
        type: 'p',
        text: 'On a grant-writing engagement, a shipped RAG pipeline cut more than 10 hours per submission and raised monthly submission volume by more than 25%, with about $13K/month in added client revenue. Those figures are measured after handoff — see the grant case study for baseline and method. Other public case studies mix measured savings with projected revenue; we label that on the work pages.',
      },
      {
        type: 'h2',
        text: 'Next step',
      },
      {
        type: 'p',
        text: 'Start with the free diagnostic. Use the report to choose no build, a 15-minute fit call, or this paid readiness audit. Do not buy an implementation until the economics are written down.',
      },
    ],
  },
  {
    slug: 'grant-writing-ai-workflow',
    title: 'Grant writing AI workflow: from 10+ hour drafts to a reviewable first pass',
    description:
      'How a nonprofit grant workflow actually changed after a RAG pipeline shipped — baseline, method, measured results, and when not to copy it.',
    date: '2026-09-10',
    author: 'Shiloh',
    blocks: [
      {
        type: 'p',
        text: 'Bottom line: grant writers were spending 10+ hours per submission on 50+ page documents. After an agentic RAG pipeline shipped, time per submission dropped by more than 10 hours, monthly submissions rose more than 25%, and the client partner reported about $13K/month in added revenue. Those numbers are measured, not modeled.',
      },
      {
        type: 'h2',
        text: 'The workflow before',
      },
      {
        type: 'ul',
        items: [
          'Read the full grant package by hand.',
          'Research requirements across sources.',
          'Draft the narrative from scratch.',
          'Cycle revisions until the team could submit — limiting how many grants went out each month.',
        ],
      },
      {
        type: 'h2',
        text: 'What shipped',
      },
      {
        type: 'p',
        text: 'Shiloh built an ingest → retrieve → draft pipeline: long documents enter a knowledge base, writers ask direct questions against the source, a draft agent produces a first narrative from current org information, and new documents update the base automatically. Fine-tune versus RAG was an explicit architecture decision for this use case — RAG won because source documents change and citations matter.',
      },
      {
        type: 'h2',
        text: 'How the numbers were measured',
      },
      {
        type: 'p',
        text: 'Baseline: 10+ hours of research and drafting per grant. Method: before/after time on the same class of submission after the pipeline was in production, plus submission velocity and monthly revenue reported by the client partner (Cyborg Mobile team). Status: measured after handoff. Window: shipped production system, not a pilot deck.',
      },
      {
        type: 'h2',
        text: 'Criteria — copy this only if',
      },
      {
        type: 'ul',
        items: [
          'The bottleneck is document-heavy drafting with a stable source of organizational truth.',
          'A human still reviews before anything is submitted. This is a first-pass system, not unsupervised filing.',
          'You can measure hours and volume. If you cannot time the current process, you cannot tell whether the build paid off.',
        ],
      },
      {
        type: 'h2',
        text: 'Risks',
      },
      {
        type: 'p',
        text: 'RAG will confidently draft from stale or incomplete sources if the knowledge base is not maintained. A fine-tune would have locked in yesterday’s language. Teams that skip review will ship errors at higher speed. If your grants are few and highly unique, a $8K–$25K agent build may lose to a paid readiness audit that says “do not automate yet.”',
      },
      {
        type: 'h2',
        text: 'Next step',
      },
      {
        type: 'p',
        text: 'Read the full case study for architecture and quotes. If your bottleneck looks similar, take the free diagnostic and compare the report to a paid AI Readiness Audit before you buy a build.',
      },
    ],
  },
] as const

export function getPost(slug: string): BlogPostMeta | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug)
}
