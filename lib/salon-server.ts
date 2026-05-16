import prisma from "@/lib/prisma";
import { slugifySalonName } from "@/lib/salon";

export async function buildUniqueSalonSlug(
  salonName: string,
  currentSalonId?: string,
) {
  const baseSlug = slugifySalonName(salonName);
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existingSalon = await prisma.salon.findFirst({
      where: {
        slug: candidate,
        ...(currentSalonId ? { id: { not: currentSalonId } } : {}),
      },
      select: {
        id: true,
      },
    });

    if (!existingSalon) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}
