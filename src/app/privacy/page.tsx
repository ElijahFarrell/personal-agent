export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">
        Effective date: 2026-04-02
      </p>
      <section className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        <p>
          We process communication metadata, delivery statuses, and user-provided
          contact data to run automation and compliance controls.
        </p>
        <p>
          Compliance records (consent evidence, suppression, legal acceptance,
          and audit outcomes) may be retained for legal defense and regulatory
          response.
        </p>
        <p>
          You are responsible for collecting lawful consent and providing
          required notices to end recipients where applicable.
        </p>
      </section>
    </main>
  )
}
