/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { BookingCorePanel } from "@/components/salon/booking-core-panel";
import {
  buildAppleMapsUrl,
  buildCallUrl,
  buildGoogleMapsUrl,
  buildWhatsAppUrl,
  getLocationLabel,
} from "@/lib/contact";
import prisma from "@/lib/prisma";
import {
  formatWorkingHoursEntry,
  normalizeWorkingHours,
  salonWeekDays,
} from "@/lib/salon";

type SalonPageProps = {
  params: {
    slug: string;
  };
};

const ritualMoments = [
  {
    title: "Choose the service",
    text: "Select the cut, beard work, or grooming session that fits your next visit.",
  },
  {
    title: "Reserve the right hour",
    text: "Live availability keeps the studio schedule visible before you confirm.",
  },
  {
    title: "Arrive without friction",
    text: "Maps, WhatsApp, and direct salon contact stay close before the appointment.",
  },
];

export async function generateMetadata({ params }: SalonPageProps) {
  const salon = await prisma.salon.findUnique({
    where: { slug: params.slug },
    select: { name: true },
  });

  if (!salon) {
    return {
      title: "Salon not found",
    };
  }

  return {
    title: `${salon.name} | Processly Beauty`,
    description: `Book a premium grooming session with ${salon.name}.`,
  };
}

export default async function SalonPage({ params }: SalonPageProps) {
  const session = await auth();
  const salon = await prisma.salon.findUnique({
    where: { slug: params.slug },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
        },
      },
      services: {
        orderBy: {
          createdAt: "asc",
        },
      },
      _count: {
        select: {
          bookings: true,
          services: true,
        },
      },
    },
  });

  if (!salon) {
    notFound();
  }

  const workingHours = normalizeWorkingHours(salon.workingHours);
  const googleMapsUrl = buildGoogleMapsUrl({
    address: salon.address,
    city: salon.city,
    latitude: salon.latitude,
    longitude: salon.longitude,
  });
  const appleMapsUrl = buildAppleMapsUrl({
    address: salon.address,
    city: salon.city,
    latitude: salon.latitude,
    longitude: salon.longitude,
  });
  const salonCallUrl = buildCallUrl(salon.contactPhone);
  const salonWhatsAppUrl = buildWhatsAppUrl(
    salon.whatsappPhone ?? salon.contactPhone,
    `Hello ${salon.name}, I want to ask about a booking.`,
  );
  const locationLabel = getLocationLabel({
    address: salon.address,
    city: salon.city,
  });
  const signedInAsOwner = session?.user?.id === salon.owner.id;
  const primaryHref = signedInAsOwner
    ? "/dashboard"
    : session?.user
      ? "/account"
      : `/login?callbackUrl=${encodeURIComponent(`/salon/${salon.slug}`)}`;
  const primaryLabel = signedInAsOwner
    ? "Open dashboard"
    : session?.user
      ? "My bookings"
      : "Sign in to book";

  return (
    <main className="meta-page-frame flex min-h-screen flex-col gap-8 py-5 sm:py-6 lg:py-8">
      <section className="meta-shell overflow-hidden rounded-[2.4rem] px-5 py-6 sm:px-8 sm:py-8">
        <div className="absolute -left-8 top-20 h-36 w-36 rounded-full bg-[rgba(190,122,73,0.16)] blur-3xl" />
        <div className="meta-drift absolute right-0 top-0 h-56 w-56 rounded-full bg-[rgba(255,255,255,0.22)] blur-3xl" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
          <article className="space-y-6">
            <div>
              <p className="meta-label">Processly Beauty Studio Page</p>
              <h1 className="meta-display mt-5 max-w-4xl text-5xl font-semibold leading-[0.92] text-[var(--foreground)] sm:text-6xl xl:text-7xl">
                {salon.name}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
                A sharper public front for premium cuts, beard detailing, and a
                booking flow that stays clear from the first click to the chair.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <span className="meta-outline-button rounded-full px-4 py-2 text-sm font-semibold">
                {salon._count.services} service
                {salon._count.services === 1 ? "" : "s"}
              </span>
              <span className="meta-outline-button rounded-full px-4 py-2 text-sm font-semibold">
                {salon._count.bookings} booking
                {salon._count.bookings === 1 ? "" : "s"}
              </span>
              <span className="meta-outline-button rounded-full px-4 py-2 text-sm font-semibold">
                Managed by {salon.owner.name}
              </span>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="meta-solid-button rounded-full px-6 py-3 text-sm font-semibold text-white"
                href={primaryHref}
              >
                {primaryLabel}
              </Link>
              {googleMapsUrl ? (
                <Link
                  className="meta-outline-button rounded-full px-6 py-3 text-sm font-semibold"
                  href={googleMapsUrl}
                  target="_blank"
                >
                  Open in Google Maps
                </Link>
              ) : null}
              {salonWhatsAppUrl ? (
                <Link
                  className="meta-outline-button rounded-full px-6 py-3 text-sm font-semibold"
                  href={salonWhatsAppUrl}
                  target="_blank"
                >
                  WhatsApp salon
                </Link>
              ) : null}
              {signedInAsOwner ? (
                <Link
                  className="meta-outline-button rounded-full px-6 py-3 text-sm font-semibold"
                  href="/dashboard"
                >
                  Open dashboard
                </Link>
              ) : null}
            </div>
          </article>

          <article className="grid gap-4 sm:grid-cols-2">
            <div className="meta-image-card meta-float rounded-[2rem] p-6 sm:col-span-2">
              <div className="relative z-10 flex h-full flex-col justify-between text-white">
                <div className="flex items-center justify-between gap-4">
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/80">
                    Premium grooming
                  </span>
                  <span className="text-xs uppercase tracking-[0.24em] text-white/70">
                    {salon.slug}
                  </span>
                </div>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="meta-display max-w-sm text-4xl font-semibold leading-tight sm:text-5xl">
                      Precision lines, calm service, and a stronger arrival flow.
                    </p>
                    <p className="mt-3 max-w-md text-sm leading-7 text-white/78">
                      Booking, directions, confirmation steps, and salon contact
                      all stay close around the appointment.
                    </p>
                  </div>

                  {salon.logo ? (
                    <img
                      alt={`${salon.name} logo`}
                      className="hidden h-24 w-24 rounded-[1.7rem] border border-white/15 object-cover shadow-[0_18px_40px_rgba(16,12,10,0.22)] sm:block"
                      src={salon.logo}
                    />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="meta-glass rounded-[1.75rem] px-5 py-5">
              <p className="meta-label">Location</p>
              <p className="meta-display mt-3 text-3xl font-semibold">
                {salon.city ?? "Casablanca-ready"}
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                {locationLabel ?? "The studio address will appear here once the owner publishes it."}
              </p>
            </div>

            <div className="meta-glass rounded-[1.75rem] px-5 py-5">
              <p className="meta-label">Contact</p>
              <p className="meta-display mt-3 text-3xl font-semibold">
                Direct and simple
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                Call, open WhatsApp, or launch maps before the appointment
                begins.
              </p>
            </div>
          </article>
        </div>
      </section>

      {salon.services.length ? (
        <BookingCorePanel
          isSignedIn={!!session?.user}
          salonContact={{
            address: salon.address,
            appleMapsUrl,
            callUrl: salonCallUrl,
            city: salon.city,
            googleMapsUrl,
            locationLabel,
            whatsappUrl: salonWhatsAppUrl,
          }}
          salonName={salon.name}
          salonSlug={salon.slug}
          services={salon.services.map((service) => ({
            description: service.description,
            duration: service.duration,
            id: service.id,
            name: service.name,
            price: service.price,
          }))}
          workingHours={workingHours}
        />
      ) : (
        <section className="meta-shell rounded-[2rem] px-6 py-7 sm:px-8">
          <p className="meta-label">Booking unavailable</p>
          <h2 className="meta-display mt-4 text-4xl font-semibold text-[var(--foreground)]">
            This studio is not publishing services yet.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-[var(--muted)] sm:text-base">
            The reservation experience opens as soon as at least one service is
            available. If you manage this salon, open the dashboard and add the
            first service to begin taking bookings.
          </p>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-[0.94fr_1.06fr]">
        <article className="meta-shell rounded-[2rem] p-6 sm:p-8">
          <p className="meta-label">Service menu</p>
          <h2 className="meta-display mt-4 text-4xl font-semibold text-[var(--foreground)] sm:text-5xl">
            Signature work, clearly priced.
          </h2>

          {salon.services.length ? (
            <div className="mt-6 grid gap-4">
              {salon.services.map((service) => (
                <div className="meta-glass rounded-[1.6rem] px-5 py-5" key={service.id}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xl font-semibold text-[var(--foreground)]">
                        {service.name}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                        {service.description ?? "A refined grooming service crafted for the Processly Beauty flow."}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="meta-display text-3xl font-semibold text-[var(--foreground)]">
                        MAD {service.price.toFixed(2)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {service.duration} min
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[1.55rem] border border-dashed border-[var(--border)] bg-white/60 px-5 py-5">
              <p className="text-sm leading-7 text-[var(--muted)]">
                No services are listed yet for this studio.
              </p>
            </div>
          )}
        </article>

        <article className="meta-shell rounded-[2rem] p-6 sm:p-8">
          <p className="meta-label">Visit rhythm</p>
          <h2 className="meta-display mt-4 text-4xl font-semibold text-[var(--foreground)] sm:text-5xl">
            A clearer route from booking to arrival.
          </h2>

          <div className="mt-6 grid gap-4">
            {ritualMoments.map((moment, index) => (
              <div
                className={`meta-glass rounded-[1.55rem] px-5 py-5 meta-reveal ${
                  index === 1 ? "meta-delay-1" : index === 2 ? "meta-delay-2" : ""
                }`}
                key={moment.title}
              >
                <p className="text-lg font-semibold text-[var(--foreground)]">
                  {moment.title}
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  {moment.text}
                </p>
              </div>
            ))}
            </div>
          </article>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="meta-shell rounded-[2rem] p-6 sm:p-8">
          <p className="meta-label">Studio hours</p>
          <h2 className="meta-display mt-4 text-4xl font-semibold text-[var(--foreground)] sm:text-5xl">
            Working week
          </h2>
          <div className="mt-6 space-y-3">
            {salonWeekDays.map((day) => (
              <div
                className="meta-glass flex items-center justify-between gap-4 rounded-[1.4rem] px-4 py-4"
                key={day.key}
              >
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {day.label}
                </p>
                <p className="text-sm text-[var(--muted)]">
                  {formatWorkingHoursEntry(workingHours[day.key])}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="meta-shell rounded-[2rem] p-6 sm:p-8">
          <p className="meta-label">Arrival guide</p>
          <h2 className="meta-display mt-4 text-4xl font-semibold text-[var(--foreground)] sm:text-5xl">
            Maps, call, and WhatsApp ready.
          </h2>
          <div className="meta-glass mt-6 rounded-[1.6rem] px-5 py-5">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {locationLabel ?? "The public address has not been published yet."}
            </p>
            <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
              Phone: {salon.contactPhone ?? "Not shared"} / WhatsApp:{" "}
              {salon.whatsappPhone ?? "Not shared"}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {googleMapsUrl ? (
                <Link
                  className="meta-outline-button rounded-full px-5 py-3 text-sm font-semibold"
                  href={googleMapsUrl}
                  target="_blank"
                >
                  Google Maps
                </Link>
              ) : null}
              {appleMapsUrl ? (
                <Link
                  className="meta-outline-button rounded-full px-5 py-3 text-sm font-semibold"
                  href={appleMapsUrl}
                  target="_blank"
                >
                  Apple Maps
                </Link>
              ) : null}
              {salonCallUrl ? (
                <Link
                  className="meta-outline-button rounded-full px-5 py-3 text-sm font-semibold"
                  href={salonCallUrl}
                >
                  Call salon
                </Link>
              ) : null}
              {salonWhatsAppUrl ? (
                <Link
                  className="meta-outline-button rounded-full px-5 py-3 text-sm font-semibold"
                  href={salonWhatsAppUrl}
                  target="_blank"
                >
                  WhatsApp salon
                </Link>
              ) : null}
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
