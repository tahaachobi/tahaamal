"use client";

type PageErrorStateProps = {
  description: string;
  reset: () => void;
  title: string;
};

export function PageErrorState({
  description,
  reset,
  title,
}: PageErrorStateProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-start justify-center gap-6 px-6 py-10 sm:px-10 lg:px-12">
      <section className="w-full rounded-[2rem] border border-rose-200 bg-[var(--surface)] p-8 shadow-[0_24px_80px_rgba(84,45,28,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-600">
          Something went wrong
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)] sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
          {description}
        </p>

        <button
          className="mt-6 inline-flex rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
