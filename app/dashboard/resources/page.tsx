import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ResourceBoard } from "@/components/dashboard/resource-board";

export default async function ResourcesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const owner = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      ownedSalon: {
        include: {
          resources: { orderBy: { createdAt: "asc" } },
          staff: { where: { role: { not: "CLIENT" } } }
        }
      }
    }
  });

  const salon = owner?.ownedSalon;
  if (!salon) redirect("/dashboard");

  return <ResourceBoard salonId={salon.id} resources={salon.resources} staff={salon.staff} />;
}
