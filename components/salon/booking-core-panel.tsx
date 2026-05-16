"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { SalonDayKey, SalonWorkingHours } from "@/lib/salon";

type ServiceOption = {
  description?: null | string;
  duration: number;
  id: string;
  name: string;
  price: number;
};

type BookingCorePanelProps = {
  isSignedIn: boolean;
  salonContact?: {
    address: null | string;
    appleMapsUrl: null | string;
    callUrl: null | string;
    city: null | string;
    googleMapsUrl: null | string;
    locationLabel: null | string;
    whatsappUrl: null | string;
  };
  salonName: string;
  salonSlug: string;
  services: ServiceOption[];
  workingHours: SalonWorkingHours;
};

type AvailableSlot = {
  endTime: string;
  startTime: string;
};

type BookingConfirmation = {
  appliedPromoCode: null | string;
  clientConfirmationStage?: string;
  confirmationLabel?: string;
  date: string;
  discountAmount: number;
  endTime: string;
  finalPrice: number;
  id: string;
  originalPrice: number;
  serviceName: string;
  startTime: string;
  status: string;
};

type PricingSummary = {
  appliedPromoCode: null | string;
  discountAmount: number;
  finalPrice: number;
  originalPrice: number;
  promoCodeId: null | string;
  promoLabel: null | string;
};

const dayKeysByIndex: Record<number, SalonDayKey> = {
  0: "sun",
  1: "mon",
  2: "tue",
  3: "wed",
  4: "thu",
  5: "fri",
  6: "sat",
};

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayInputDate() {
  return formatInputDate(new Date());
}

function getInitialBookingDate(workingHours: SalonWorkingHours) {
  const date = new Date();

  for (let offset = 1; offset <= 14; offset += 1) {
    const candidate = new Date(date);
    candidate.setDate(candidate.getDate() + offset);

    const dayKey = dayKeysByIndex[candidate.getDay()];

    if (!workingHours[dayKey].closed) {
      return formatInputDate(candidate);
    }
  }

  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 1);

  return formatInputDate(fallback);
}

function formatDisplayDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function isClosedOnDate(value: string, workingHours: SalonWorkingHours) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return false;
  }

  const date = new Date(year, month - 1, day);
  const dayKey = dayKeysByIndex[date.getDay()];

  return workingHours[dayKey].closed;
}

function buildBasePricing(price: number): PricingSummary {
  return {
    appliedPromoCode: null,
    discountAmount: 0,
    finalPrice: price,
    originalPrice: price,
    promoCodeId: null,
    promoLabel: null,
  };
}

export function BookingCorePanel({
  isSignedIn,
  salonContact,
  salonName,
  salonSlug,
  services,
  workingHours,
}: BookingCorePanelProps) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState(() => getInitialBookingDate(workingHours));
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(
    null,
  );
  const [promoCode, setPromoCode] = useState("");
  const [pricing, setPricing] = useState<PricingSummary>(() =>
    buildBasePricing(services[0]?.price ?? 0),
  );
  const [feedback, setFeedback] = useState<null | {
    message: string;
    tone: "error" | "success";
  }>(null);
  const [isLoadingSlots, startLoadingSlots] = useTransition();
  const [isBooking, startBooking] = useTransition();
  const [isApplyingPromo, startApplyingPromo] = useTransition();

  const selectedService = services.find((service) => service.id === serviceId);
  const selectedDateIsClosed = isClosedOnDate(date, workingHours);

  useEffect(() => {
    setPricing(buildBasePricing(selectedService?.price ?? 0));
  }, [selectedService?.id, selectedService?.price]);

  useEffect(() => {
    const normalizedCode = promoCode.trim().toUpperCase();

    if (
      pricing.appliedPromoCode &&
      normalizedCode !== pricing.appliedPromoCode &&
      selectedService
    ) {
      setPricing(buildBasePricing(selectedService.price));
    }
  }, [pricing.appliedPromoCode, promoCode, selectedService]);

  useEffect(() => {
    if (!serviceId || !date) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }

    setSelectedSlot(null);
    setConfirmation(null);

    startLoadingSlots(async () => {
      try {
        setFeedback(null);

        const response = await fetch(
          `/api/salon/${salonSlug}/availability?serviceId=${encodeURIComponent(
            serviceId,
          )}&date=${encodeURIComponent(date)}`,
          {
            cache: "no-store",
          },
        );

        const payload = (await response.json()) as {
          error?: string;
          slots?: AvailableSlot[];
        };

        if (!response.ok) {
          setSlots([]);
          setFeedback({
            tone: "error",
            message:
              payload.error ?? "We could not load time slots for that date.",
          });
          return;
        }

        setSlots(payload.slots ?? []);
      } catch {
        setSlots([]);
        setFeedback({
          tone: "error",
          message: "We could not load time slots right now. Please try again.",
        });
      }
    });
  }, [date, salonSlug, serviceId]);

  function handleConfirmBooking() {
    if (!selectedSlot || !selectedService) {
      setFeedback({
        tone: "error",
        message: "Choose a service and time slot before confirming.",
      });
      return;
    }

    if (!isSignedIn) {
      setFeedback({
        tone: "error",
        message: "Sign in first to confirm this booking.",
      });
      return;
    }

    startBooking(async () => {
      try {
        const response = await fetch("/api/bookings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            salonSlug,
            serviceId,
            date,
            promoCode: pricing.appliedPromoCode ?? undefined,
            startTime: selectedSlot.startTime,
          }),
        });

        const payload = (await response.json()) as {
          booking?: BookingConfirmation;
          error?: string;
        };

        if (!response.ok || !payload.booking) {
          setConfirmation(null);
          setSelectedSlot(null);
          setFeedback({
            tone: "error",
            message:
              payload.error ?? "We could not create the booking right now.",
          });
        } else {
          setConfirmation(payload.booking);
          setFeedback({
            tone: "success",
            message: "Booking request created successfully.",
          });
        }

        const refreshedAvailability = await fetch(
          `/api/salon/${salonSlug}/availability?serviceId=${encodeURIComponent(
            serviceId,
          )}&date=${encodeURIComponent(date)}`,
          {
            cache: "no-store",
          },
        );
        const refreshedPayload = (await refreshedAvailability.json()) as {
          slots?: AvailableSlot[];
        };
        setSlots(refreshedPayload.slots ?? []);
      } catch {
        setConfirmation(null);
        setSelectedSlot(null);
        setFeedback({
          tone: "error",
          message: "We could not reach the server. Please try again.",
        });
      }
    });
  }

  function handleBookAnother() {
    setConfirmation(null);
    setSelectedSlot(null);
    setFeedback(null);
    setPromoCode("");
    setPricing(buildBasePricing(selectedService?.price ?? 0));
  }

  function handleApplyPromo() {
    if (!selectedService) {
      setFeedback({
        tone: "error",
        message: "Choose a service before applying a promo code.",
      });
      return;
    }

    if (!promoCode.trim()) {
      setPricing(buildBasePricing(selectedService.price));
      setFeedback({
        tone: "success",
        message: "Promo cleared. Base price restored in the panier.",
      });
      return;
    }

    if (!isSignedIn) {
      setFeedback({
        tone: "error",
        message: "Sign in first to validate a promo code.",
      });
      return;
    }

    startApplyingPromo(async () => {
      try {
        const response = await fetch(
          `/api/salon/${salonSlug}/pricing?serviceId=${encodeURIComponent(
            selectedService.id,
          )}&code=${encodeURIComponent(promoCode)}`,
          {
            cache: "no-store",
          },
        );

        const payload = (await response.json()) as {
          error?: string;
          pricing?: PricingSummary;
        };

        if (!response.ok || !payload.pricing) {
          setPricing(buildBasePricing(selectedService.price));
          setFeedback({
            tone: "error",
            message:
              payload.error ?? "We could not validate that promo code right now.",
          });
          return;
        }

        setPricing(payload.pricing);
        setFeedback({
          tone: "success",
          message: payload.pricing.appliedPromoCode
            ? `Promo ${payload.pricing.appliedPromoCode} applied to the panier.`
            : "Base price loaded.",
        });
      } catch {
        setPricing(buildBasePricing(selectedService.price));
        setFeedback({
          tone: "error",
          message: "We could not validate the promo code right now.",
        });
      }
    });
  }

  if (confirmation && selectedService) {
    return (
      <section className="meta-shell rounded-[2rem] px-5 py-6 sm:px-7 sm:py-7">
        <div className="meta-notice-success rounded-[1.6rem] p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.28em]">
            Reservation secured
          </p>
          <h2 className="meta-display mt-4 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
            Your chair request is in.
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--muted)] sm:text-base">
            We saved this booking for {salonName}. It is currently waiting for
            the salon&apos;s review, while your account keeps the confirmation
            steps, reminders, and arrival actions close.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="meta-glass rounded-2xl px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                Service
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                {selectedService.name}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {selectedService.duration} min
              </p>
            </div>

            <div className="meta-glass rounded-2xl px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                Time
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                {formatDisplayDate(confirmation.date)}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {confirmation.startTime} - {confirmation.endTime}
              </p>
            </div>

            <div className="meta-glass rounded-2xl px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                Price
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                MAD {confirmation.finalPrice.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {confirmation.discountAmount > 0
                  ? `Discount saved: MAD ${confirmation.discountAmount.toFixed(2)}`
                  : `Original price: MAD ${confirmation.originalPrice.toFixed(2)}`}
              </p>
            </div>

            <div className="meta-glass rounded-2xl px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                Status
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                {confirmation.status}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {confirmation.appliedPromoCode
                  ? `Promo used: ${confirmation.appliedPromoCode}`
                  : `Booking id: ${confirmation.id}`}
              </p>
            </div>
          </div>

          <div className="meta-glass mt-4 rounded-2xl px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              Confirmation flow
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
              {confirmation.confirmationLabel ?? "Awaiting first confirmation"}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Open <span className="font-semibold">My bookings</span> to confirm
              you are coming, then respond again when the reminder window opens
              before the appointment.
            </p>
          </div>

          {salonContact?.locationLabel ||
          salonContact?.googleMapsUrl ||
          salonContact?.whatsappUrl ||
          salonContact?.callUrl ? (
            <div className="meta-glass mt-4 rounded-2xl px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                Salon contact
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                {salonContact.locationLabel ?? "Contact actions are ready below."}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {salonContact.googleMapsUrl ? (
                  <Link
                    className="meta-outline-button inline-flex justify-center rounded-full px-4 py-2 text-sm font-semibold"
                    href={salonContact.googleMapsUrl}
                    target="_blank"
                  >
                    Google Maps
                  </Link>
                ) : null}
                {salonContact.appleMapsUrl ? (
                  <Link
                    className="meta-outline-button inline-flex justify-center rounded-full px-4 py-2 text-sm font-semibold"
                    href={salonContact.appleMapsUrl}
                    target="_blank"
                  >
                    Apple Maps
                  </Link>
                ) : null}
                {salonContact.whatsappUrl ? (
                  <Link
                    className="meta-outline-button inline-flex justify-center rounded-full px-4 py-2 text-sm font-semibold"
                    href={salonContact.whatsappUrl}
                    target="_blank"
                  >
                    WhatsApp
                  </Link>
                ) : null}
                {salonContact.callUrl ? (
                  <Link
                    className="meta-outline-button inline-flex justify-center rounded-full px-4 py-2 text-sm font-semibold"
                    href={salonContact.callUrl}
                  >
                    Call salon
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              className="meta-solid-button inline-flex justify-center rounded-full px-5 py-3 text-sm font-semibold text-white"
              onClick={handleBookAnother}
              type="button"
            >
              Book another slot
            </button>
            <Link
              className="meta-outline-button inline-flex justify-center rounded-full px-5 py-3 text-sm font-semibold"
              href="/account"
            >
              View my bookings
            </Link>
            <Link
              className="meta-outline-button inline-flex justify-center rounded-full px-5 py-3 text-sm font-semibold"
              href={`/salon/${salonSlug}`}
            >
              Stay on this page
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="meta-shell rounded-[2rem] px-5 py-6 sm:px-7 sm:py-7">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="meta-label">
              Reservation flow
            </p>
            <h2 className="meta-display mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)] sm:text-4xl">
              Reserve your chair with live pricing before you confirm.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
              Choose the service, the date, and the available hour, then review
              the full booking summary before sending the reservation request.
            </p>
          </div>

          {isSignedIn ? (
            <div className="meta-notice-success rounded-[1.35rem] px-4 py-3 text-sm">
              Session active. You can confirm this booking instantly.
            </div>
          ) : (
            <Link
              className="meta-outline-button inline-flex justify-center rounded-full px-5 py-3 text-sm font-semibold"
              href={`/login?callbackUrl=${encodeURIComponent(`/salon/${salonSlug}`)}`}
            >
              Sign in to continue
            </Link>
          )}
        </div>

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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div className="space-y-5">
            <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                    Step 1
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                    Choose a service
                  </h3>
                </div>
                <p className="text-sm text-[var(--muted)]">
                  {services.length} option{services.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="mt-4 grid gap-3">
                {services.map((service) => {
                  const isSelected = service.id === serviceId;

                  return (
                    <button
                      className={`rounded-[1.4rem] border px-4 py-4 text-left transition ${
                        isSelected
                          ? "border-[var(--accent)] bg-[rgba(181,84,49,0.10)] shadow-[0_12px_30px_rgba(181,84,49,0.12)]"
                          : "border-[var(--border)] bg-white hover:border-[var(--accent)]"
                      }`}
                      key={service.id}
                      onClick={() => setServiceId(service.id)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-base font-semibold text-[var(--foreground)]">
                          {service.name}
                        </p>
                        <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-semibold text-[var(--accent)]">
                          MAD {service.price.toFixed(2)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        {service.description ?? "Service details will appear here."}
                      </p>
                      <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
                        {service.duration} minutes
                      </p>
                    </button>
                  );
                })}
              </div>
            </article>

            <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                Step 2
              </p>
              <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                Pick a date
              </h3>

              <label className="mt-4 block space-y-2">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Booking date
                </span>
                <input
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(181,84,49,0.15)]"
                  min={getTodayInputDate()}
                  onChange={(event) => setDate(event.target.value)}
                  type="date"
                  value={date}
                />
              </label>

              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                {selectedDateIsClosed
                  ? "This salon is closed on the selected day, so no booking slots will appear."
                  : `Showing availability for ${formatDisplayDate(date)}.`}
              </p>
            </article>

            <article className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                    Step 3
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                    Select a time slot
                  </h3>
                </div>
                {isLoadingSlots ? (
                  <p className="text-sm text-[var(--muted)]">Checking slots...</p>
                ) : null}
              </div>

              {slots.length ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {slots.map((slot) => {
                    const isSelected =
                      selectedSlot?.startTime === slot.startTime &&
                      selectedSlot.endTime === slot.endTime;

                    return (
                      <button
                        className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition ${
                          isSelected
                            ? "border-[var(--accent)] bg-[var(--foreground)] text-white shadow-[0_16px_30px_rgba(35,24,21,0.18)]"
                            : "border-[var(--border)] bg-white text-[var(--foreground)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        }`}
                        key={`${slot.startTime}-${slot.endTime}`}
                        onClick={() => setSelectedSlot(slot)}
                        type="button"
                      >
                        {slot.startTime}
                        <span className="mt-1 block text-xs font-medium opacity-80">
                          until {slot.endTime}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-[var(--border)] bg-white/70 px-4 py-4">
                  <p className="text-sm leading-6 text-[var(--muted)]">
                    {selectedDateIsClosed
                      ? "Choose another date to see bookable times."
                      : "No slots are available for this date right now. Try another day or another service."}
                  </p>
                </div>
              )}
            </article>
          </div>

          <aside className="space-y-5">
            <article className="meta-dark-card rounded-[1.5rem] p-5 text-[#f5eee7]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f0a17f]">
                Step 4
              </p>
              <h3 className="mt-2 text-xl font-semibold">
                Review your booking summary
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#d8cec6]">
                Review the service, the time, the promo, and the final total
                before you send the reservation request.
              </p>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#f0a17f]">
                    Salon
                  </p>
                  <p className="mt-2 text-sm font-semibold">{salonName}</p>
                  {salonContact?.locationLabel ? (
                    <p className="mt-1 text-sm text-[#d8cec6]">
                      {salonContact.locationLabel}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#f0a17f]">
                    Service
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {selectedService?.name ?? "Choose a service"}
                  </p>
                  <p className="mt-1 text-sm text-[#d8cec6]">
                    {selectedService
                      ? `${selectedService.duration} min - base MAD ${selectedService.price.toFixed(2)}`
                      : "Select one option from the list first."}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#f0a17f]">
                    When
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {formatDisplayDate(date)}
                  </p>
                  <p className="mt-1 text-sm text-[#d8cec6]">
                    {selectedSlot
                      ? `${selectedSlot.startTime} - ${selectedSlot.endTime}`
                      : "Choose a slot from step 3."}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-[#f0a17f]">
                      Promo code
                    </p>
                    {pricing.appliedPromoCode ? (
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
                        {pricing.appliedPromoCode}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <input
                      className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/10 px-4 py-3 text-sm uppercase text-white outline-none placeholder:text-[#b9aaa0] focus:border-[#f0a17f]"
                      onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                      placeholder="WELCOME10"
                      type="text"
                      value={promoCode}
                    />
                    <button
                      className="inline-flex justify-center rounded-full bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={!selectedService || isApplyingPromo}
                      onClick={handleApplyPromo}
                      type="button"
                    >
                      {isApplyingPromo ? "Checking..." : "Apply"}
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-[#d8cec6]">
                    {pricing.promoLabel
                      ? `${pricing.promoLabel} is applied to this panier.`
                      : "Add a promo code if the salon shared one with you."}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#f0a17f]">
                    Price summary
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-[#f5eee7]">
                    <div className="flex items-center justify-between gap-4">
                      <span>Original price</span>
                      <span>MAD {pricing.originalPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span>Discount</span>
                      <span>
                        {pricing.discountAmount > 0
                          ? `- MAD ${pricing.discountAmount.toFixed(2)}`
                          : "MAD 0.00"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-2 text-base font-semibold">
                      <span>Final total</span>
                      <span>MAD {pricing.finalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {salonContact?.googleMapsUrl ||
                salonContact?.whatsappUrl ||
                salonContact?.callUrl ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-[#f0a17f]">
                      Contact and maps
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {salonContact.googleMapsUrl ? (
                        <Link
                          className="inline-flex justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30"
                          href={salonContact.googleMapsUrl}
                          target="_blank"
                        >
                          Google Maps
                        </Link>
                      ) : null}
                      {salonContact.appleMapsUrl ? (
                        <Link
                          className="inline-flex justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30"
                          href={salonContact.appleMapsUrl}
                          target="_blank"
                        >
                          Apple Maps
                        </Link>
                      ) : null}
                      {salonContact.whatsappUrl ? (
                        <Link
                          className="inline-flex justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30"
                          href={salonContact.whatsappUrl}
                          target="_blank"
                        >
                          WhatsApp
                        </Link>
                      ) : null}
                      {salonContact.callUrl ? (
                        <Link
                          className="inline-flex justify-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30"
                          href={salonContact.callUrl}
                        >
                          Call salon
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              {isSignedIn ? (
                <button
                  className="mt-5 inline-flex w-full justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!selectedSlot || !selectedService || isBooking}
                  onClick={handleConfirmBooking}
                  type="button"
                >
                  {isBooking ? "Creating booking..." : "Reserve this chair"}
                </button>
              ) : (
                <Link
                  className="mt-5 inline-flex w-full justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:opacity-95"
                  href={`/login?callbackUrl=${encodeURIComponent(`/salon/${salonSlug}`)}`}
                >
                  Sign in to reserve
                </Link>
              )}
            </article>

            <article className="meta-glass rounded-[1.5rem] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                Arrival support
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                After you reserve, the client account keeps confirmation steps,
                reminders, maps, and salon contact actions ready before the
                appointment starts.
              </p>
            </article>
          </aside>
        </div>
      </div>
    </section>
  );
}
