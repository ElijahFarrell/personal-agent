import Link from 'next/link'

export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-6">
      <section className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6 text-center">
        <h1 className="text-xl font-semibold text-white">Access denied</h1>
        <p className="mt-3 text-sm text-gray-300">
          Your account is signed in, but it has not been provisioned in an
          organization for this app.
        </p>
        <p className="mt-2 text-sm text-gray-400">
          Ask an administrator to invite you to a Clerk organization first.
        </p>
        <div className="mt-6">
          <Link
            href="/sign-in"
            className="inline-flex rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
          >
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  )
}
