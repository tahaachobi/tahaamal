import { NextResponse } from "next/server";
import { Role } from "@/app/generated/prisma/enums";
import prisma from "@/lib/prisma";
import { validateTenantContext } from "@/lib/modules/auth/tenant-guard";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const query = (url.searchParams.get("q") || "").trim();
    const requestSalonId = url.searchParams.get("salonId");

    // Rate limit search requests to prevent database exhaustion
    const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const limitResponse = rateLimit(ip, "client_search", { limit: 30, intervalMs: 60000 });
    if (limitResponse) return limitResponse;

    // Multi-tenant context validation
    const authResult = await validateTenantContext(
      [Role.SALON_OWNER, Role.CASHIER, Role.ADMIN],
      requestSalonId
    );

    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 400 });
    }

    const context = authResult.context!;
    const targetSalonId = context.salonId;

    if (!targetSalonId) {
      return NextResponse.json({ error: "Missing salon identifier." }, { status: 400 });
    }

    // Direct database fuzzy filter (case-insensitive contains)
    const matchedClients = await prisma.user.findMany({
      where: {
        role: Role.CLIENT,
        // Since clients are mapped by bookings or salon registration, 
        // we can fetch users associated with this salon slug or who have bookings in this salon.
        bookings: {
          some: {
            salonId: targetSalonId
          }
        },
        OR: query ? [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
          { phone: { contains: query, mode: "insensitive" } }
        ] : undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        loyaltyPoints: true,
        trustStars: true,
        createdAt: true
      },
      take: 20, // Strict page limit for optimized scaling
      orderBy: { name: "asc" }
    });

    return NextResponse.json({ clients: matchedClients });
  } catch (error) {
    console.error("Client fuzzy search API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
