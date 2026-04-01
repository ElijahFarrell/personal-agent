export type BlogPostMeta = {
  slug: string
  title: string
  description: string
  date: string
  content: string
}

export const BLOG_POSTS: readonly BlogPostMeta[] = [
  {
    slug: 'ai-lead-qualification-real-estate',
    title: 'AI lead qualification for real estate (what to look for)',
    description:
      'Buyer questions answered in 200–400 word blocks: workflows, CRM sync, and governance.',
    date: '2026-03-01',
    content: `Bottom line: production lead qualification connects channels, writes structured CRM fields, and routes hot leads with policy — not generic chat.

Buyers ask how fast you respond, where data lives, and who approves outbound messages. Answer in short blocks with sources when you cite stats.

Replace this stub with your long-form GEO content and internal links.`,
  },
  {
    slug: 'geo-for-b2b-ai-products',
    title: 'GEO checklist for B2B AI products',
    description:
      'CITABLE-style outline: entity clarity, FAQs, comparisons, and consistent naming.',
    date: '2026-03-15',
    content: `Generative engines favor explicit Q&A, comparison tables, and consistent entity names — mirror that in your site structure.

Use BLUF paragraphs up front, FAQ components with schema, and stats with sources when you claim numbers.`,
  },
] as const

export function getPost(slug: string): BlogPostMeta | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug)
}
