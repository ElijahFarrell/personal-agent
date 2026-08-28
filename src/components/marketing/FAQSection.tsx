import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export type FaqItem = { question: string; answer: string }

export function FAQSection({
  id = 'faq',
  title = 'Questions buyers ask',
  subtitle,
  items,
}: {
  id?: string
  title?: string
  subtitle?: string
  items: readonly FaqItem[]
}) {
  return (
    <section className="relative px-4 py-16 sm:px-6" aria-labelledby={id}>
      <div className="mx-auto max-w-3xl">
        <h2
          id={id}
            className="font-display text-3xl tracking-tight text-foreground md:text-4xl"
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-3 text-center text-muted-foreground">{subtitle}</p>
        ) : null}
        <Accordion type="single" collapsible className="mt-10 w-full divide-y divide-border border-y border-border">
          {items.map((item, i) => (
            <AccordionItem
              key={item.question}
              value={`item-${i}`}
              className="border-0 px-0"
            >
              <AccordionTrigger className="py-5 text-left font-medium text-foreground hover:no-underline hover:text-brand-600">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
