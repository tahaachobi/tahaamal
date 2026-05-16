import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSafeInternalPath } from "@/lib/navigation";
import { splitProfileName } from "@/lib/profile-fields";
import { CompleteProfileForm } from "@/components/auth/complete-profile-form";

type CompleteProfilePageProps = {
  searchParams?: {
    next?: string;
  };
};

export default async function CompleteProfilePage({
  searchParams,
}: CompleteProfilePageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=%2Fcomplete-profile");
  }

  const nextPath = getSafeInternalPath(searchParams?.next) ?? "";

  if (session.user.profileCompleted) {
    redirect(
      nextPath ||
        (session.user.role === "SALON_OWNER" ? "/dashboard" : "/account"),
    );
  }

  const initialName = splitProfileName(session.user.name);

  return (
    <main className="min-h-screen bg-[#f4f7fb]">
      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12 xl:px-14">
        <article className="w-full max-w-[34rem] rounded-[2rem] border border-[#e3ebf5] bg-white p-6 shadow-[0_20px_55px_rgba(13,22,34,0.08)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#7d8ea5]">
            Finish setup
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[#101d2a] sm:text-5xl">
            One last step
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-[#607086] sm:text-base">
            Your Google sign-in is connected. Add the details the booking
            flow still needs before you enter the app.
          </p>

          <div className="mt-8">
            <CompleteProfileForm
              defaultFirstName={initialName.firstName}
              defaultLastName={initialName.lastName}
              defaultPhone={session.user.phone ?? ""}
              defaultRole={
                session.user.role === "SALON_OWNER" ? "SALON_OWNER" : "CLIENT"
              }
              email={session.user.email ?? ""}
              nextPath={nextPath}
            />
          </div>
        </article>
      </section>
    </main>
  );
}

