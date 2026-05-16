import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SalonProfileForm } from "@/components/dashboard/salon-profile-form";
import { ServiceManagementPanel } from "@/components/dashboard/service-management-panel";
import type { SalonWorkingHours } from "@/lib/salon";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const owner = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      ownedSalon: {
        include: {
          services: {
            orderBy: { name: "asc" },
            include: { _count: { select: { bookings: true } } },
          },
          _count: { select: { staff: true, resources: true, bookings: true } },
        },
      },
    },
  });

  const salon = owner?.ownedSalon;
  if (!salon) redirect("/dashboard");

  const salonForForm = {
    name: salon.name,
    slug: salon.slug,
    logo: salon.logo,
    address: salon.address,
    city: salon.city,
    contactPhone: salon.contactPhone,
    whatsappPhone: salon.whatsappPhone,
    latitude: salon.latitude,
    longitude: salon.longitude,
    workingHours: salon.workingHours as SalonWorkingHours,
    publicPath: `/salon/${salon.slug}`,
  };

  const servicesForPanel = salon.services.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description ?? "",
    price: s.price,
    duration: s.duration,
    loyaltyPoints: s.loyaltyPoints,
    bookingsCount: s._count.bookings,
  }));

  return (
    <div className="luna-stack" style={{ gap: 20 }}>
      <div>
        <h1 className="luna-h1">Settings</h1>
        <p className="luna-text-muted" style={{ marginTop: 4, fontSize: 13 }}>
          Manage your salon profile, working hours, and service catalog.
        </p>
      </div>

      {/* Salon Stats */}
      <div className="luna-grid-kpi">
        <div className="luna-kpi-card">
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Staff Members</p>
          <p style={{ fontSize: 26, fontWeight: 800 }}>{salon._count.staff}</p>
        </div>
        <div className="luna-kpi-card">
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Resources</p>
          <p style={{ fontSize: 26, fontWeight: 800 }}>{salon._count.resources}</p>
        </div>
        <div className="luna-kpi-card">
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Services</p>
          <p style={{ fontSize: 26, fontWeight: 800 }}>{salon.services.length}</p>
        </div>
        <div className="luna-kpi-card">
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Total Bookings</p>
          <p style={{ fontSize: 26, fontWeight: 800 }}>{salon._count.bookings}</p>
        </div>
      </div>

      {/* Salon Profile */}
      <div className="luna-card luna-card-p">
        <h2 className="luna-h2" style={{ marginBottom: 16 }}>Salon Profile</h2>
        <SalonProfileForm initialSalon={salonForForm} />
      </div>

      {/* Service Management */}
      <div className="luna-card luna-card-p">
        <h2 className="luna-h2" style={{ marginBottom: 16 }}>Service Catalog</h2>
        <ServiceManagementPanel initialServices={servicesForPanel} />
      </div>
    </div>
  );
}
