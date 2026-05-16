import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="meta-page-frame flex min-h-screen max-w-4xl items-center py-10">
      <section className="w-full rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[0_24px_80px_rgba(84,45,28,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[var(--accent)]">
          Access Restricted
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
          This area is for salon owners only.
        </h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted)]">
          Your account is authenticated, but it does not have permission to open
          the owner dashboard.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            className="rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95"
            href="/"
          >
            Return home
          </Link>
          <Link
            className="rounded-full border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            href="/register"
          >
            Create owner account
          </Link>
        </div>
      </section>
    </main>
  );
}
