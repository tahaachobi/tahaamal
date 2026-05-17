import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Role } from "@/app/generated/prisma/enums";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (key !== "AntigravitySuperSecret123") {
      return NextResponse.json({ error: "Unauthorized access key." }, { status: 401 });
    }

    const workingHours = {
      mon: { open: "09:00", close: "18:00" },
      tue: { open: "09:00", close: "18:00" },
      wed: { open: "09:00", close: "18:00" },
      thu: { open: "09:00", close: "19:00" },
      fri: { open: "09:00", close: "19:00" },
      sat: { open: "10:00", close: "16:00" },
      sun: { open: null, close: null },
    };

    const adminPassword = await hashPassword("admin1234");
    const ownerPassword = await hashPassword("owner1234");
    const clientPassword = await hashPassword("client1234");
    const staffPassword = await hashPassword("staff1234");

    // ── Super Admin ──
    await prisma.user.upsert({
      where: { email: "admin@luna.ma" },
      update: { name: "Antigravity Admin", role: Role.ADMIN, password: adminPassword },
      create: { name: "Antigravity Admin", email: "admin@luna.ma", role: Role.ADMIN, password: adminPassword },
    });

    // ── Primary Owner (User's Account) ──
    const owner = await prisma.user.upsert({
      where: { email: "ttahaamal@gmail.com" },
      update: {
        name: "Taha Ammal",
        role: Role.SALON_OWNER,
      },
      create: {
        name: "Taha Ammal",
        email: "ttahaamal@gmail.com",
        password: ownerPassword,
        role: Role.SALON_OWNER,
      },
    });

    // ── Clients ──
    const clientsData = [
      { name: "Yassine Mansouri", email: "yassine@test.ma", phone: "+212611111111" },
      { name: "Fatima Zahra", email: "fatima@test.ma", phone: "+212622222222" },
      { name: "Amine El Amrani", email: "amine@test.ma", phone: "+212633333333" },
      { name: "Siham Alaoui", email: "siham@test.ma", phone: "+212644444444" },
    ];

    for (const c of clientsData) {
      await prisma.user.upsert({
        where: { email: c.email },
        update: { name: c.name, phone: c.phone, role: Role.CLIENT, loyaltyPoints: 150 },
        create: { name: c.name, email: c.email, phone: c.phone, password: clientPassword, role: Role.CLIENT, loyaltyPoints: 150 },
      });
    }

    // ── Salon ──
    const salon = await prisma.salon.upsert({
      where: { slug: "luna-hair-studio" },
      update: {
        name: "Luna Hair Studio",
        ownerId: owner.id,
        address: "123 Boulevard Anfa, Casablanca",
        city: "Casablanca",
        contactPhone: "+212 522 123456",
        workingHours,
      },
      create: {
        name: "Luna Hair Studio",
        slug: "luna-hair-studio",
        ownerId: owner.id,
        address: "123 Boulevard Anfa, Casablanca",
        city: "Casablanca",
        contactPhone: "+212 522 123456",
        workingHours,
      },
    });

    // ── Staff ──
    const staffNames = ["Karim", "Nadia", "Youssef", "Sara"];
    for (const name of staffNames) {
      await prisma.user.upsert({
        where: { email: `${name.toLowerCase()}@luna.ma` },
        update: { name: `${name} Stylist`, role: Role.STAFF, salonId: salon.id },
        create: { name: `${name} Stylist`, email: `${name.toLowerCase()}@luna.ma`, password: staffPassword, role: Role.STAFF, salonId: salon.id },
      });
    }

    // ── Resources ──
    const resources = [
      { name: "Chair 01", type: "CHAIR" },
      { name: "Chair 02", type: "CHAIR" },
      { name: "Room 01", type: "ROOM" },
      { name: "Spa Bed", type: "BED" },
    ];
    for (const r of resources) {
      await prisma.resource.upsert({
        where: { salonId_name: { salonId: salon.id, name: r.name } },
        update: { type: r.type },
        create: { name: r.name, type: r.type, salonId: salon.id },
      });
    }

    // ── Services ──
    const services = [
      { name: "Coupe Homme", price: 150, duration: 30 },
      { name: "Barbe Ritual", price: 80, duration: 20 },
      { name: "Coupe & Barbe", price: 200, duration: 45 },
      { name: "Soin Visage", price: 300, duration: 60 },
    ];
    for (const s of services) {
      await prisma.service.upsert({
        where: { salonId_name: { salonId: salon.id, name: s.name } },
        update: { price: s.price, duration: s.duration },
        create: { ...s, salonId: salon.id },
      });
    }

    return NextResponse.json({ success: true, message: "Production database successfully seeded!" });
  } catch (error: any) {
    console.error("Database seed API error:", error);
    return NextResponse.json({ error: "Seeding failed.", details: error.message }, { status: 500 });
  }
}
