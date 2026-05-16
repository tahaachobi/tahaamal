import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/register-form";
import { isGoogleAuthEnabled } from "@/lib/auth-flow";

export default async function RegisterPage() {
  const session = await auth();
  const googleAuthEnabled = isGoogleAuthEnabled();

  if (session?.user) {
    if (!session.user.profileCompleted) {
      redirect("/complete-profile");
    }

    redirect(session.user.role === "SALON_OWNER" ? "/dashboard" : "/account");
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] auth-page-enter">
      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12 xl:px-14">
        <article className="w-full max-w-[34rem] rounded-[2rem] border border-[#e3ebf5] bg-white p-6 shadow-[0_20px_55px_rgba(13,22,34,0.08)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7d8ea5]">
            Create account
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[#101d2a] sm:text-5xl">
            Open your beauty workspace
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-[#607086] sm:text-base">
            Fill in your details below to create your account and start booking.
          </p>

          <div className="mt-8">
            <RegisterForm googleAuthEnabled={googleAuthEnabled} />
          </div>
        </article>
      </section>
    </main>
  );
}

