type PageLoadingShellProps = {
  description: string;
  title: string;
};

export function PageLoadingShell({
  description,
  title,
}: PageLoadingShellProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:px-10 lg:px-12">
      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[0_24px_80px_rgba(84,45,28,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
          Loading
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
          {description}
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="animate-pulse rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-5">
            <div className="h-5 w-40 rounded-full bg-[rgba(35,24,21,0.08)]" />
            <div className="mt-4 h-4 w-full rounded-full bg-[rgba(35,24,21,0.08)]" />
            <div className="mt-3 h-4 w-4/5 rounded-full bg-[rgba(35,24,21,0.08)]" />
            <div className="mt-6 h-10 w-full rounded-2xl bg-[rgba(35,24,21,0.08)]" />
          </div>
          <div className="animate-pulse rounded-[1.5rem] border border-[var(--border)] bg-white/70 p-5">
            <div className="h-5 w-32 rounded-full bg-[rgba(35,24,21,0.08)]" />
            <div className="mt-4 h-24 w-full rounded-[1.25rem] bg-[rgba(35,24,21,0.08)]" />
          </div>
        </div>
      </section>
    </main>
  );
}
