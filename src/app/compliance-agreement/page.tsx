export default function ComplianceAgreementPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold">Compliance Agreement</h1>
      <p className="text-sm text-muted-foreground">
        Effective date: 2026-04-02
      </p>
      <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          You agree to maintain compliant calling and messaging practices,
          including consent controls, DNC hygiene, quiet-hour restrictions,
          truthful caller identification, and AI disclosure where required.
        </p>
        <p>
          You must keep sufficient records (consent, suppression, logs, and
          campaign evidence) and cooperate with compliance reviews.
        </p>
        <p>
          Repeated violations may result in immediate suspension of outbound
          functionality.
        </p>
      </section>
    </main>
  )
}
