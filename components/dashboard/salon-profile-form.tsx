"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState, useTransition } from "react";
import {
  buildAppleMapsUrl,
  buildCallUrl,
  buildGoogleMapsUrl,
  buildWhatsAppUrl,
  getLocationLabel,
} from "@/lib/contact";
import {
  getDefaultWorkingHours,
  salonWeekDays,
  slugifySalonName,
  type SalonWorkingHours,
} from "@/lib/salon";

type SalonProfileFormProps = {
  initialSalon?: {
    address: null | string;
    city: null | string;
    contactPhone: null | string;
    latitude: null | number;
    logo: null | string;
    name: string;
    publicPath: string;
    slug: string;
    whatsappPhone: null | string;
    workingHours: SalonWorkingHours;
    longitude: null | number;
  };
};

type FormWorkingHours = Record<
  keyof SalonWorkingHours,
  {
    closed: boolean;
    close: string;
    open: string;
  }
>;

function buildFormWorkingHours(hours?: SalonWorkingHours): FormWorkingHours {
  const baseHours = hours ?? getDefaultWorkingHours();

  return salonWeekDays.reduce((accumulator, day) => {
    accumulator[day.key] = {
      closed: baseHours[day.key].closed,
      open: baseHours[day.key].open ?? day.suggestedOpen,
      close: baseHours[day.key].close ?? day.suggestedClose,
    };

    return accumulator;
  }, {} as FormWorkingHours);
}

export function SalonProfileForm({ initialSalon }: SalonProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialSalon?.name ?? "");
  const [logo, setLogo] = useState(initialSalon?.logo ?? "");
  const [address, setAddress] = useState(initialSalon?.address ?? "");
  const [city, setCity] = useState(initialSalon?.city ?? "");
  const [contactPhone, setContactPhone] = useState(
    initialSalon?.contactPhone ?? "",
  );
  const [whatsappPhone, setWhatsappPhone] = useState(
    initialSalon?.whatsappPhone ?? "",
  );
  const [latitude, setLatitude] = useState(
    initialSalon?.latitude?.toString() ?? "",
  );
  const [longitude, setLongitude] = useState(
    initialSalon?.longitude?.toString() ?? "",
  );
  const [workingHours, setWorkingHours] = useState<FormWorkingHours>(
    buildFormWorkingHours(initialSalon?.workingHours),
  );
  const [feedback, setFeedback] = useState<null | {
    message: string;
    tone: "error" | "success";
  }>(null);
  const [publicPath, setPublicPath] = useState(initialSalon?.publicPath ?? "");
  const [isPending, startTransition] = useTransition();

  const slugPreview = useMemo(() => {
    if (publicPath) {
      return publicPath;
    }

    return `/salon/${slugifySalonName(name || "salon")}`;
  }, [name, publicPath]);
  const locationLabel = getLocationLabel({ address, city });
  const mapsGoogleUrl = buildGoogleMapsUrl({
    address,
    city,
    latitude: latitude ? Number.parseFloat(latitude) : null,
    longitude: longitude ? Number.parseFloat(longitude) : null,
  });
  const mapsAppleUrl = buildAppleMapsUrl({
    address,
    city,
    latitude: latitude ? Number.parseFloat(latitude) : null,
    longitude: longitude ? Number.parseFloat(longitude) : null,
  });
  const callUrl = buildCallUrl(contactPhone);
  const whatsappUrl = buildWhatsAppUrl(
    whatsappPhone,
    name
      ? `Hello ${name}, I want to ask about a booking.`
      : "Hello, I want to ask about a booking.",
  );

  function updateWorkingHour(
    dayKey: keyof FormWorkingHours,
    field: "open" | "close",
    value: string,
  ) {
    setWorkingHours((currentHours) => ({
      ...currentHours,
      [dayKey]: {
        ...currentHours[dayKey],
        [field]: value,
      },
    }));
  }

  function toggleClosed(dayKey: keyof FormWorkingHours, closed: boolean) {
    setWorkingHours((currentHours) => ({
      ...currentHours,
      [dayKey]: {
        ...currentHours[dayKey],
        closed,
      },
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/salon", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            address,
            city,
            contactPhone,
            latitude,
            longitude,
            name,
            logo,
            whatsappPhone,
            workingHours,
          }),
        });

        const payload = (await response.json()) as {
          error?: string;
          salon?: {
            address: null | string;
            city: null | string;
            contactPhone: null | string;
            latitude: null | number;
            publicPath: string;
            whatsappPhone: null | string;
            workingHours: SalonWorkingHours;
            longitude: null | number;
          };
        };

        if (!response.ok) {
          setFeedback({
            tone: "error",
            message:
              payload.error ?? "We could not save the salon profile right now.",
          });
          return;
        }

        if (payload.salon) {
          setAddress(payload.salon.address ?? "");
          setCity(payload.salon.city ?? "");
          setContactPhone(payload.salon.contactPhone ?? "");
          setWhatsappPhone(payload.salon.whatsappPhone ?? "");
          setLatitude(payload.salon.latitude?.toString() ?? "");
          setLongitude(payload.salon.longitude?.toString() ?? "");
          setPublicPath(payload.salon.publicPath);
          setWorkingHours(buildFormWorkingHours(payload.salon.workingHours));
        }

        setFeedback({
          tone: "success",
          message: "Salon profile saved. Your public page is ready.",
        });
        router.refresh();
      } catch {
        setFeedback({
          tone: "error",
          message: "We could not reach the server. Please try again.",
        });
      }
    });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {feedback ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            feedback.tone === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--foreground)]">
            Salon name
          </span>
          <input
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(181,84,49,0.15)]"
            onChange={(event) => setName(event.target.value)}
            placeholder="Luna Hair Studio"
            required
            type="text"
            value={name}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--foreground)]">
            Logo URL
          </span>
          <input
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(181,84,49,0.15)]"
            onChange={(event) => setLogo(event.target.value)}
            placeholder="https://example.com/logo.jpg"
            type="url"
            value={logo}
          />
        </label>
      </div>

      <div className="rounded-[1.5rem] border border-[var(--border)] bg-white/70 px-5 py-5">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
            Contact and location
          </p>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Add the salon phone, WhatsApp line, and map coordinates so clients
            can call, chat, and open directions after booking.
          </p>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Address
            </span>
            <input
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(181,84,49,0.15)]"
              onChange={(event) => setAddress(event.target.value)}
              placeholder="123 Boulevard Hassan II"
              type="text"
              value={address}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              City
            </span>
            <input
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(181,84,49,0.15)]"
              onChange={(event) => setCity(event.target.value)}
              placeholder="Casablanca"
              type="text"
              value={city}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Contact phone
            </span>
            <input
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(181,84,49,0.15)]"
              onChange={(event) => setContactPhone(event.target.value)}
              placeholder="+212612345678"
              type="tel"
              value={contactPhone}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              WhatsApp phone
            </span>
            <input
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(181,84,49,0.15)]"
              onChange={(event) => setWhatsappPhone(event.target.value)}
              placeholder="+212612345678"
              type="tel"
              value={whatsappPhone}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Latitude
            </span>
            <input
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(181,84,49,0.15)]"
              onChange={(event) => setLatitude(event.target.value)}
              placeholder="33.5731"
              step="0.000001"
              type="number"
              value={latitude}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Longitude
            </span>
            <input
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(181,84,49,0.15)]"
              onChange={(event) => setLongitude(event.target.value)}
              placeholder="-7.5898"
              step="0.000001"
              type="number"
              value={longitude}
            />
          </label>
        </div>

        {locationLabel || callUrl || whatsappUrl || mapsGoogleUrl ? (
          <div className="mt-5 rounded-[1.35rem] border border-[var(--border)] bg-white px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              Client quick actions preview
            </p>
            {locationLabel ? (
              <p className="mt-2 text-sm text-[var(--foreground)]">
                {locationLabel}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              {mapsGoogleUrl ? (
                <Link
                  className="inline-flex rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  href={mapsGoogleUrl}
                  target="_blank"
                >
                  Open in Google Maps
                </Link>
              ) : null}
              {mapsAppleUrl ? (
                <Link
                  className="inline-flex rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  href={mapsAppleUrl}
                  target="_blank"
                >
                  Open in Apple Maps
                </Link>
              ) : null}
              {callUrl ? (
                <Link
                  className="inline-flex rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  href={callUrl}
                >
                  Call salon
                </Link>
              ) : null}
              {whatsappUrl ? (
                <Link
                  className="inline-flex rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  href={whatsappUrl}
                  target="_blank"
                >
                  Open WhatsApp
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-[1.5rem] border border-[var(--border)] bg-white/70 px-5 py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              Public URL
            </p>
            <p className="mt-2 font-mono text-sm text-[var(--foreground)]">
              {slugPreview}
            </p>
          </div>

          {publicPath ? (
            <Link
              className="inline-flex rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              href={publicPath}
              target="_blank"
            >
              Open public page
            </Link>
          ) : null}
        </div>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          The slug is generated automatically from your salon name and kept
          unique across the platform.
        </p>
      </div>

      <div className="rounded-[1.5rem] border border-[var(--border)] bg-white/70 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              Working Hours
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              These hours drive the live booking slots shown on the public page.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {salonWeekDays.map((day) => (
            <div
              className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white px-4 py-4 md:grid-cols-[0.8fr_0.8fr_0.8fr_0.8fr]"
              key={day.key}
            >
              <div className="flex items-center justify-between gap-4 md:block">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {day.label}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                    {day.shortLabel}
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-[var(--muted)] md:mt-4">
                  <input
                    checked={workingHours[day.key].closed}
                    onChange={(event) => toggleClosed(day.key, event.target.checked)}
                    type="checkbox"
                  />
                  Closed
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                  Open
                </span>
                <input
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(181,84,49,0.15)] disabled:cursor-not-allowed disabled:bg-stone-100"
                  disabled={workingHours[day.key].closed}
                  onChange={(event) =>
                    updateWorkingHour(day.key, "open", event.target.value)
                  }
                  type="time"
                  value={workingHours[day.key].open}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                  Close
                </span>
                <input
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(181,84,49,0.15)] disabled:cursor-not-allowed disabled:bg-stone-100"
                  disabled={workingHours[day.key].closed}
                  onChange={(event) =>
                    updateWorkingHour(day.key, "close", event.target.value)
                  }
                  type="time"
                  value={workingHours[day.key].close}
                />
              </label>

              <div className="flex items-end">
                <p className="rounded-2xl bg-[rgba(181,84,49,0.08)] px-4 py-3 text-sm text-[var(--accent)]">
                  {workingHours[day.key].closed
                    ? "Closed"
                    : `${workingHours[day.key].open} - ${workingHours[day.key].close}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        className="w-full rounded-2xl bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        type="submit"
      >
        {isPending
          ? "Saving salon profile..."
          : initialSalon
            ? "Save salon changes"
            : "Create salon profile"}
      </button>
    </form>
  );
}
