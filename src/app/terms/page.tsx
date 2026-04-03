export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">
        Effective date: 2026-04-02
      </p>
      <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          By using the calling and automation features, you agree to comply with
          all applicable telemarketing and messaging laws, including TCPA, TSR,
          federal/state DNC obligations, and related disclosure and recording
          requirements.
        </p>
        <p>
          We provide technical safeguards to assist compliance. You remain
          responsible for lawful use, obtaining and maintaining required consent,
          and honoring suppression and opt-out requests.
        </p>
        <p>
          We may suspend calling features when policy violations are detected.
        </p>
      </section>
    </main>
  )
}
