import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role === "SALON_OWNER" || session.user.role === "ADMIN") {
    redirect("/dashboard");
  }

  redirect("/account");
}
