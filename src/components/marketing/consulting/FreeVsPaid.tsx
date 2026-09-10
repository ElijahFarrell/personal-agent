import Link from 'next/link'
import { auditFit, auditInputs, freeVsPaid } from '@/lib/marketing/consulting-copy'

export function FreeVsPaid() {
  return (
    <section
      className="relative px-4 py-16 sm:px-6 sm:py-20"
      aria-labelledby="free-vs-paid-heading"
    >
      <div className="mx-auto max-w-6xl">
        <h2
          id="free-vs-paid-heading"
          className="font-display text-2xl tracking-tight text-foreground sm:text-3xl"
        >
          {freeVsPaid.heading}
        </h2>
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-y border-border text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-3 pr-4 font-medium"> </th>
                <th className="py-3 pr-4 font-medium">Free diagnostic</th>
                <th className="py-3 font-medium">Paid readiness audit</th>
              </tr>
            </thead>
            <tbody>
              {freeVsPaid.rows.map((row) => (
                <tr key={row.label} className="border-b border-border align-top">
                  <th className="py-4 pr-4 font-medium text-foreground">
                    {row.label}
                  </th>
                  <td className="py-4 pr-4 text-muted-foreground">{row.free}</td>
                  <td className="py-4 text-muted-foreground">{row.paid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-12 grid gap-10 md:grid-cols-2">
          <div>
            <h3 className="font-display text-xl text-foreground">
              {auditFit.heading}
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {auditFit.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h3 className="font-display mt-8 text-xl text-foreground">
              {auditFit.notHeading}
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {auditFit.notItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-display text-xl text-foreground">
              {auditInputs.heading}
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {auditInputs.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-muted-foreground">
              {auditInputs.privacy}{' '}
              <Link href="/privacy" className="font-medium text-brand-600 hover:text-brand-700">
                Privacy policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
