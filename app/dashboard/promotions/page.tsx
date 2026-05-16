import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PromoManagementPanel } from "@/components/dashboard/promo-management-panel";
import { Role } from "@/app/generated/prisma/enums";

type LoyaltyHistoryEntry = {
  balanceAfter: number;
  clientId: string;
  createdAt: string;
  delta: number;
  id: string;
  note: string;
  source: "ADMIN" | "SYSTEM_NO_SHOW" | "SYSTEM_POS";
};

function parseAuditDetails(value: null | string) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default async function PromotionsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const owner = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      ownedSalon: {
        include: {
          promoCodes: {
            include: {
              bookings: {
                include: { user: { select: { name: true, email: true } } },
                orderBy: { createdAt: "desc" },
                take: 5,
              },
              _count: { select: { bookings: true } },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  const salon = owner?.ownedSalon;
  if (!salon) redirect("/dashboard");

  // Fetch all clients to display their loyalty points
  const clients = await prisma.user.findMany({
    where: {
      role: Role.CLIENT,
      bookings: {
        some: {
          salonId: salon.id,
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      loyaltyPoints: true,
    },
    orderBy: { loyaltyPoints: "desc" }
  });

  const loyaltyAuditLogs = clients.length
    ? await prisma.auditLog.findMany({
        where: {
          action: {
            in: [
              "LOYALTY_POINTS_AWARDED",
              "LOYALTY_POINTS_ADJUSTED",
              "LOYALTY_POINTS_NO_SHOW_PENALTY",
            ],
          },
          entity: "User",
          entityId: {
            in: clients.map((client) => client.id),
          },
          salonId: salon.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 200,
      })
    : [];

  const loyaltyHistoryByClient = loyaltyAuditLogs.reduce<Record<string, LoyaltyHistoryEntry[]>>(
    (historyMap, log) => {
      if (!log.entityId) {
        return historyMap;
      }

      const details = parseAuditDetails(log.details);
      let delta = 0;
      let note = "Loyalty balance updated";
      let source: LoyaltyHistoryEntry["source"] = "ADMIN";

      if (log.action === "LOYALTY_POINTS_AWARDED") {
        delta = Number(details?.earnedPoints ?? details?.appliedDelta ?? 0);
        source = "SYSTEM_POS";
        const serviceNames = Array.isArray(details?.serviceNames)
          ? details?.serviceNames.filter((value): value is string => typeof value === "string")
          : [];
        note = serviceNames.length
          ? `POS reward from ${serviceNames.join(", ")}`
          : "POS reward from completed checkout";
      } else if (log.action === "LOYALTY_POINTS_NO_SHOW_PENALTY") {
        delta = -Math.abs(Number(details?.penaltyPoints ?? details?.appliedDelta ?? 0));
        source = "SYSTEM_NO_SHOW";
        const serviceName =
          typeof details?.serviceName === "string" ? details.serviceName : "booked service";
        const bookingDate =
          typeof details?.bookingDate === "string" ? details.bookingDate : "scheduled date";
        note = `No-show penalty for ${serviceName} on ${bookingDate}`;
      } else {
        delta = Number(details?.appliedDelta ?? 0);
        source = "ADMIN";
        note =
          typeof details?.reason === "string" && details.reason.trim()
            ? details.reason
            : delta > 0
              ? "Manual loyalty increase by owner"
              : delta < 0
                ? "Manual loyalty decrease by owner"
                : "Manual loyalty balance review";
      }

      const balanceAfter = Number(details?.balanceAfter ?? details?.nextBalance ?? 0);
      const entry: LoyaltyHistoryEntry = {
        balanceAfter,
        clientId: log.entityId,
        createdAt: log.createdAt.toISOString(),
        delta,
        id: log.id,
        note,
        source,
      };

      historyMap[log.entityId] = [...(historyMap[log.entityId] ?? []), entry];
      return historyMap;
    },
    {},
  );

  const promos = salon.promoCodes.map(p => ({
    id: p.id,
    code: p.code,
    type: p.type,
    value: p.value,
    isActive: p.isActive,
    startsAt: p.startsAt?.toISOString() || null,
    endsAt: p.endsAt?.toISOString() || null,
    usageLimit: p.usageLimit,
    oneTimePerClient: p.oneTimePerClient,
    usageCount: p._count.bookings,
    createdAt: p.createdAt.toISOString(),
    recentBookings: p.bookings.map(b => ({
      id: b.id,
      userName: b.user.name,
      userEmail: b.user.email,
      status: b.status,
      finalPrice: b.finalPrice,
      createdAt: b.createdAt.toISOString(),
    })),
  }));

  return (
    <div className="luna-stack" style={{ gap: 20 }}>
      <div>
        <h1 className="luna-h1">Loyalty & Promotions</h1>
        <p className="luna-text-muted" style={{ marginTop: 4, fontSize: 13 }}>
          Manage promo codes, loyalty rewards, and client incentives.
        </p>
      </div>
      <PromoManagementPanel 
        initialPromos={promos} 
        clients={clients}
        initialHistoryByClient={loyaltyHistoryByClient}
      />
    </div>
  );
}
