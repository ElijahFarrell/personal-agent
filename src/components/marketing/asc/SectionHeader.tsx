type SectionHeaderProps = {
  id?: string
  eyebrow?: string
  title: string
  subtitle?: string
  align?: 'center' | 'left'
}

export function SectionHeader({
  id,
  eyebrow,
  title,
  subtitle,
  align = 'center',
}: SectionHeaderProps) {
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-left'

  return (
    <header className={`max-w-3xl ${alignClass}`}>
      {eyebrow ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">
          {eyebrow}
        </p>
      ) : null}
      <h2
        id={id}
        className="font-display text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
      >
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-pretty text-lg leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
    </header>
  )
}
