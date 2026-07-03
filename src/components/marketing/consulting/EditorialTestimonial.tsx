import { editorialTestimonial } from '@/lib/marketing/consulting-copy'

export function EditorialTestimonial() {
  const { quote, attribution, project } = editorialTestimonial

  return (
    <section
      className="relative px-4 py-20 sm:px-6 sm:py-28"
      aria-labelledby="testimonial-heading"
    >
      <div className="mx-auto max-w-3xl text-center">
        <h2 id="testimonial-heading" className="sr-only">
          Client testimonial
        </h2>
        <blockquote>
          <p className="font-display text-2xl leading-relaxed text-foreground sm:text-3xl">
            &ldquo;{quote}&rdquo;
          </p>
          <footer className="mt-8">
            <p className="text-sm font-medium text-foreground">— {attribution}</p>
            <p className="mt-2 text-xs text-muted-foreground">{project}</p>
          </footer>
        </blockquote>
      </div>
    </section>
  )
}
