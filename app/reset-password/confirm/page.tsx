import { ResetPasswordConfirmForm } from "@/components/auth/reset-password-confirm-form";

type ResetPasswordConfirmPageProps = {
  searchParams?: {
    token?: string;
    email?: string;
  };
};

export default function ResetPasswordConfirmPage({ searchParams }: ResetPasswordConfirmPageProps) {
  const token = searchParams?.token || "";
  const email = searchParams?.email || "";

  return (
    <main className="min-h-screen bg-[#f4f7fb]">
      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12 xl:px-14">
        <article className="w-full max-w-[28rem] rounded-[2rem] border border-[#e3ebf5] bg-white p-6 shadow-[0_20px_55px_rgba(13,22,34,0.08)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7d8ea5]">
            Account access
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[#101d2a] sm:text-5xl">
            Choose new password
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#607086] sm:text-base">
            Almost there! Enter a new password for your account below.
          </p>

          <div className="mt-8">
            <ResetPasswordConfirmForm email={email} token={token} />
          </div>
        </article>
      </section>
    </main>
  );
}
