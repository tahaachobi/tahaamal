import { ResetPasswordRequestForm } from "@/components/auth/reset-password-request-form";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb]">
      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12 xl:px-14">
        <article className="w-full max-w-[28rem] rounded-[2rem] border border-[#e3ebf5] bg-white p-6 shadow-[0_20px_55px_rgba(13,22,34,0.08)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7d8ea5]">
            Account access
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[#101d2a] sm:text-5xl">
            Reset password
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#607086] sm:text-base">
            Enter your email and we&apos;ll send you a link to get back into your account.
          </p>

          <div className="mt-8">
            <ResetPasswordRequestForm />
          </div>
        </article>
      </section>
    </main>
  );
}
