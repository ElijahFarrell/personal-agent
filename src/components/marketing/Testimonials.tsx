'use client'

import * as React from 'react'
import { Quote } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel'
import {
  testimonials,
  testimonialsHeadline,
  testimonialsSubhead,
} from '@/lib/marketing/copy'
import { cn } from '@/lib/utils'

const AUTOPLAY_MS = 6500

function TestimonialCard({
  item,
}: {
  item: (typeof testimonials)[number]
}) {
  return (
    <Card className="glass mx-auto flex h-full max-w-3xl flex-col border-white/10">
      <CardContent className="flex flex-1 flex-col pt-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Quote
            className="h-8 w-8 shrink-0 text-brand-400/80"
            aria-hidden
          />
          {item.isParaphrase ? (
            <Badge
              variant="outline"
              className="border-white/20 text-[10px] font-normal uppercase tracking-wide text-muted-foreground"
            >
              Representative quote
            </Badge>
          ) : null}
        </div>
        <blockquote className="flex-1 text-base leading-relaxed text-white/95">
          &ldquo;{item.quote}&rdquo;
        </blockquote>
        <p className="mt-4 text-sm font-medium text-white">
          — {item.attribution}
        </p>
        {item.project ? (
          <p className="mt-3 text-xs text-muted-foreground">
            <span className="font-medium text-white/80">Project:</span>{' '}
            {item.project}
          </p>
        ) : null}
        {item.results && item.results.length > 0 ? (
          <div className="mt-3 border-t border-white/10 pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-200/90">
              Result
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
              {item.results.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function Testimonials() {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)

  React.useEffect(() => {
    if (!api) return
    setCurrent(api.selectedScrollSnap())
    const onSelect = () => setCurrent(api.selectedScrollSnap())
    api.on('select', onSelect)
    return () => {
      api.off('select', onSelect)
    }
  }, [api])

  React.useEffect(() => {
    if (!api) return
    const id = window.setInterval(() => {
      api.scrollNext()
    }, AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [api])

  return (
    <section
      className="relative px-4 py-16 sm:px-6"
      aria-labelledby="social-heading"
    >
      <div className="mx-auto max-w-6xl">
        <h2
          id="social-heading"
          className="font-display text-center text-3xl font-bold tracking-tight text-white md:text-4xl"
        >
          {testimonialsHeadline}
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
          {testimonialsSubhead}
        </p>

        <Carousel
          opts={{ loop: true, align: 'center', duration: 22 }}
          setApi={setApi}
          className="mt-10"
        >
          <CarouselContent>
            {testimonials.map((item) => (
              <CarouselItem key={item.id} className="basis-full pl-4">
                <TestimonialCard item={item} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div
          className="mt-6 flex justify-center gap-2"
          role="group"
          aria-label="Choose testimonial"
        >
          {testimonials.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-current={current === i ? 'true' : undefined}
              aria-label={`Show testimonial ${i + 1} of ${testimonials.length}`}
              className={cn(
                'h-2 w-2 rounded-full transition-colors',
                current === i
                  ? 'bg-brand-400'
                  : 'bg-white/20 hover:bg-white/35'
              )}
              onClick={() => api?.scrollTo(i)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
