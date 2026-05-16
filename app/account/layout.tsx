import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function AccountLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=%2Faccount");
  }

  if (!session.user.profileCompleted) {
    redirect("/complete-profile?next=%2Faccount");
  }

  return (
    <main className="meta-page-frame flex min-h-screen flex-col gap-8 py-10">
      <header className="flex flex-col gap-5 rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_24px_80px_rgba(84,45,28,0.08)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
            My Booking History
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
            Welcome back, {session.user.name}.
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Signed in as {session.user.email}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            href="/"
          >
            Home
          </Link>
          {session.user.role === "SALON_OWNER" ? (
            <Link
              className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              href="/dashboard"
            >
              Owner dashboard
            </Link>
          ) : null}
          <SignOutButton callbackUrl="/" />
        </div>
      </header>

      {children}
    </main>
  );
}
