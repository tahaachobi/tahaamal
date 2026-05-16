"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  BookingStatus,
  ClientConfirmationStage,
} from "@/app/generated/prisma/enums";
import {
  buildCallUrl,
  buildGoogleMapsUrl,
  buildWhatsAppUrl,
  getLocationLabel,
} from "@/lib/contact";
import {
  canClientInteractWithBooking,
  confirmationStageClasses,
  formatConfirmationStage,
} from "@/lib/booking-confirmation";

type AccountBooking = {
  appliedPromoCode: null | string;
  bookingDate: string;
  clientConfirmationStage: ClientConfirmationStage;
  createdAt: string;
  discountAmount: number;
  endTime: string;
  finalConfirmedAt: null | string;
  finalPrice: number;
  firstConfirmedAt: null | string;
  id: string;
  originalPrice: number;
  reminderSentAt: null | string;
  startTime: string;
  status: BookingStatus;
  salon: {
    address: null | string;
    city: null | string;
    contactPhone: null | string;
    latitude: null | number;
    logo: string | null;
    name: string;
    slug: string;
    longitude: null | number;
    whatsappPhone: null | string;
  };
  service: {
    duration: number;
    name: string;
    price: number;
  };
};

type AccountHistoryPanelProps = {
  bookings: AccountBooking[];
  memberSince: string;
  user: {
    email: string;
    loyaltyPoints: number;
    name: string;
    phone: null | string;
    trustStars: number;
  };
};

type ClientBookingAction =
  | "CANCEL_BOOKING"
  | "CONFIRM_ATTENDING"
  | "REQUEST_RESCHEDULE";

function formatBookingDate(value: string) {
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

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getAppointmentDate(date: string, time: string) {
  return new Date(`${date}T${time}:00`);
}

function statusClasses(status: BookingStatus) {
  switch (status) {
    case BookingStatus.CONFIRMED:
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case BookingStatus.COMPLETED:
      return "border border-sky-200 bg-sky-50 text-sky-700";
    case BookingStatus.CANCELLED:
      return "border border-stone-200 bg-stone-100 text-stone-600";
    case BookingStatus.NO_SHOW:
      return "border border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border border-amber-200 bg-amber-50 text-amber-700";
  }
}

function trustClasses(stars: number) {
  if (stars >= 4) {
    return {
      badge: "border border-emerald-200 bg-emerald-50 text-emerald-700",
      label: "Reliable client",
    };
  }

  if (stars >= 3) {
    return {
      badge: "border border-amber-200 bg-amber-50 text-amber-700",
      label: "Watchlist level",
    };
  }

  return {
    badge: "border border-rose-200 bg-rose-50 text-rose-700",
    label: "Risk alert",
  };
}

function formatCountdown(diffMs: number) {
  if (diffMs <= 0) {
    return "Due now";
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m left`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }

  return `${minutes}m left`;
}

function getCountdownTone(
  status: BookingStatus,
  diffMs: number,
): "neutral" | "good" | "warn" | "muted" | "danger" {
  if (status === BookingStatus.CANCELLED) {
    return "muted";
  }

  if (status === BookingStatus.NO_SHOW) {
    return "danger";
  }

  if (status === BookingStatus.COMPLETED) {
    return "good";
  }

  if (diffMs <= 3 * 60 * 60 * 1000) {
    return "warn";
  }

  if (status === BookingStatus.CONFIRMED) {
    return "good";
  }

  return "neutral";
}

function countdownClasses(tone: ReturnType<typeof getCountdownTone>) {
  switch (tone) {
    case "good":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case "danger":
      return "border border-rose-200 bg-rose-50 text-rose-700";
    case "warn":
      return "border border-amber-200 bg-amber-50 text-amber-700";
    case "muted":
      return "border border-stone-200 bg-stone-100 text-stone-600";
    default:
      return "border border-[var(--border)] bg-white text-[var(--foreground)]";
  }
}

function getCountdownLabel(
  booking: AccountBooking,
  nowMs: number,
  isNextAppointment: boolean,
) {
  if (booking.status === BookingStatus.CANCELLED) {
    return {
      label: "Cancelled appointment",
      tone: getCountdownTone(booking.status, Number.POSITIVE_INFINITY),
    };
  }

  if (booking.status === BookingStatus.NO_SHOW) {
    return {
      label: "Marked no-show",
      tone: getCountdownTone(booking.status, Number.POSITIVE_INFINITY),
    };
  }

  if (booking.status === BookingStatus.COMPLETED) {
    return {
      label: "Service completed",
      tone: getCountdownTone(booking.status, Number.POSITIVE_INFINITY),
    };
  }

  const appointmentStartMs = getAppointmentDate(
    booking.bookingDate,
    booking.startTime,
  ).getTime();
  const appointmentEndMs = getAppointmentDate(
    booking.bookingDate,
    booking.endTime,
  ).getTime();
  const diffMs = appointmentStartMs - nowMs;

  if (diffMs > 0) {
    return {
      label: isNextAppointment
        ? `Next up in ${formatCountdown(diffMs)}`
        : `Starts in ${formatCountdown(diffMs)}`,
      tone: getCountdownTone(booking.status, diffMs),
    };
  }

  if (nowMs <= appointmentEndMs) {
    return {
      label:
        booking.status === BookingStatus.CONFIRMED
          ? "Check-in window open"
          : "Appointment is due now",
      tone: getCountdownTone(booking.status, diffMs),
    };
  }

  return {
    label:
      booking.status === BookingStatus.CONFIRMED
        ? "Service window passed"
        : "Awaiting final update",
    tone: getCountdownTone(booking.status, diffMs),
  };
}

function getConfirmButtonLabel(booking: AccountBooking) {
  if (
    booking.clientConfirmationStage ===
      ClientConfirmationStage.AWAITING_FINAL_CONFIRMATION ||
    booking.clientConfirmationStage === ClientConfirmationStage.FINAL_CONFIRMED ||
    booking.reminderSentAt
  ) {
    return "Final confirm";
  }

  return "I am coming";
}

export function AccountHistoryPanel({
  bookings: initialBookings,
  memberSince,
  user,
}: AccountHistoryPanelProps) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [feedback, setFeedback] = useState<null | {
    message: string;
    tone: "error" | "success";
  }>(null);
  const [pendingBookingId, setPendingBookingId] = useState<null | string>(null);
  const [pendingAction, setPendingAction] = useState<null | ClientBookingAction>(
    null,
  );
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter(
    (booking) => booking.status === BookingStatus.PENDING,
  ).length;
  const confirmedBookings = bookings.filter(
    (booking) => booking.status === BookingStatus.CONFIRMED,
  ).length;
  const cancelledBookings = bookings.filter(
    (booking) => booking.status === BookingStatus.CANCELLED,
  ).length;

  const nextBooking = useMemo(() => {
    return bookings
      .filter((booking) => {
        if (booking.status === BookingStatus.CANCELLED) {
          return false;
        }

        return (
          getAppointmentDate(booking.bookingDate, booking.startTime).getTime() >
          nowMs
        );
      })
      .sort((left, right) => {
        const leftDate = getAppointmentDate(
          left.bookingDate,
          left.startTime,
        ).getTime();
        const rightDate = getAppointmentDate(
          right.bookingDate,
          right.startTime,
        ).getTime();

        return leftDate - rightDate;
      })[0];
  }, [bookings, nowMs]);

  const trust = trustClasses(user.trustStars);
  const nextBookingCountdown = nextBooking
    ? getCountdownLabel(nextBooking, nowMs, true)
    : null;

  function runBookingAction(bookingId: string, action: ClientBookingAction) {
    setFeedback(null);
    setPendingAction(action);
    setPendingBookingId(bookingId);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/account/bookings/${bookingId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        });

        const payload = (await response.json()) as {
          booking?: AccountBooking;
          error?: string;
        };

        if (!response.ok || !payload.booking) {
          setFeedback({
            tone: "error",
            message:
              payload.error ??
              "We could not update this booking right now. Please try again.",
          });
          setPendingAction(null);
          setPendingBookingId(null);
          return;
        }

        setBookings((currentBookings) =>
          currentBookings.map((booking) =>
            booking.id === payload.booking?.id ? payload.booking : booking,
          ),
        );
        setFeedback({
          tone: "success",
          message:
            action === "CONFIRM_ATTENDING"
              ? "Your confirmation was saved."
              : action === "REQUEST_RESCHEDULE"
                ? "Your reschedule request was sent to the salon."
                : "Your booking was cancelled.",
        });
        setPendingAction(null);
        setPendingBookingId(null);
        router.refresh();
      } catch {
        setFeedback({
          tone: "error",
          message: "We could not reach the server. Please try again.",
        });
        setPendingAction(null);
        setPendingBookingId(null);
      }
    });
  }

  return (
    <section className="space-y-6">
      <article className="print-card rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
              Client Account
            </p>
            <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
              All your bookings, timers, confirmations, and loyalty details in one place.
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Track pending, confirmed, and cancelled appointments, print your
              booking history, watch the next haircut countdown, and answer the
              two-step confirmation flow from here.
            </p>
          </div>

          <div className="print-hidden flex flex-wrap gap-3">
            <button
              className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              onClick={() => window.print()}
              type="button"
            >
              Print history
            </button>
            <Link
              className="inline-flex items-center justify-center rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
              href="/"
            >
              Book another service
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              Trust
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {user.trustStars}/5
            </p>
            <span
              className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${trust.badge}`}
            >
              {trust.label}
            </span>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              Points
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {user.loyaltyPoints}
            </p>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
              Saved on your client profile.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              Total
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {totalBookings}
            </p>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
              Full booking history.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              Pending
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {pendingBookings}
            </p>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
              Waiting for final validation.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              Confirmed
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {confirmedBookings}
            </p>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
              Ready appointments on file.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              Cancelled
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {cancelledBookings}
            </p>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
              Kept for your full history.
            </p>
          </div>
        </div>
      </article>

      <article className="print-card rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[1.5rem] border border-[var(--border)] bg-white/85 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
              Next Appointment
            </p>
            {nextBooking ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <p className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                    {nextBooking.service.name}
                  </p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${statusClasses(
                      nextBooking.status,
                    )}`}
                  >
                    {nextBooking.status}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${confirmationStageClasses(
                      nextBooking.clientConfirmationStage,
                    )}`}
                  >
                    {formatConfirmationStage(nextBooking.clientConfirmationStage)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {nextBooking.salon.name} / {formatBookingDate(nextBooking.bookingDate)} /{" "}
                  {nextBooking.startTime} - {nextBooking.endTime}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${countdownClasses(
                      nextBookingCountdown?.tone ?? "neutral",
                    )}`}
                  >
                    {nextBookingCountdown?.label}
                  </span>
                  <Link
                    className="inline-flex rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    href={`/salon/${nextBooking.salon.slug}`}
                  >
                    Open salon page
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                  No upcoming booking yet.
                </p>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
                  As soon as you reserve your next haircut, the live countdown
                  will appear here so you can follow exactly how much time is
                  left before the appointment.
                </p>
              </>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-[var(--border)] bg-white/85 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
              Profile Snapshot
            </p>
            <p className="mt-3 text-xl font-semibold text-[var(--foreground)]">
              {user.name}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">{user.email}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {user.phone ?? "No phone saved yet"}
            </p>
            <div className="mt-5 space-y-3 text-sm text-[var(--muted)]">
              <p>
                <span className="font-semibold text-[var(--foreground)]">
                  Member since:
                </span>{" "}
                {formatCreatedAt(memberSince)}
              </p>
              <p>
                <span className="font-semibold text-[var(--foreground)]">
                  Trust stars:
                </span>{" "}
                {user.trustStars}/5
              </p>
              <p>
                <span className="font-semibold text-[var(--foreground)]">
                  Loyalty points:
                </span>{" "}
                {user.loyaltyPoints}
              </p>
            </div>
          </div>
        </div>
      </article>

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

      <article className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
              Booking history
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Your latest reservations appear first, with the timer, current
              status, and confirmation workflow visible on every card.
            </p>
          </div>
          <p className="print-hidden text-sm text-[var(--muted)]">
            Use &quot;Print history&quot; for a paper copy of this page.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {bookings.length ? (
            bookings.map((booking) => {
              const countdown = getCountdownLabel(
                booking,
                nowMs,
                booking.id === nextBooking?.id,
              );
              const canInteract = canClientInteractWithBooking(
                booking.status,
                booking.bookingDate,
                booking.endTime,
              );
              const mapsUrl = buildGoogleMapsUrl({
                address: booking.salon.address,
                city: booking.salon.city,
                latitude: booking.salon.latitude,
                longitude: booking.salon.longitude,
              });
              const whatsappUrl = buildWhatsAppUrl(
                booking.salon.whatsappPhone ?? booking.salon.contactPhone,
                `Hello ${booking.salon.name}, I want to talk about my booking on ${booking.bookingDate} at ${booking.startTime}.`,
              );
              const callUrl = buildCallUrl(booking.salon.contactPhone);
              const locationLabel = getLocationLabel({
                address: booking.salon.address,
                city: booking.salon.city,
              });
              const confirmDisabled =
                !canInteract ||
                booking.clientConfirmationStage ===
                  ClientConfirmationStage.FINAL_CONFIRMED;
              const isActionPending = isPending && pendingBookingId === booking.id;

              return (
                <div
                  className="print-card rounded-[1.5rem] border border-[var(--border)] bg-white/80 p-5"
                  key={booking.id}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-4">
                      {booking.salon.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt={`${booking.salon.name} logo`}
                          className="h-14 w-14 rounded-2xl object-cover"
                          src={booking.salon.logo}
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(181,84,49,0.12)] text-sm font-semibold text-[var(--accent)]">
                          {booking.salon.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-lg font-semibold text-[var(--foreground)]">
                            {booking.service.name}
                          </p>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${statusClasses(
                              booking.status,
                            )}`}
                          >
                            {booking.status}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${confirmationStageClasses(
                              booking.clientConfirmationStage,
                            )}`}
                          >
                            {formatConfirmationStage(booking.clientConfirmationStage)}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${countdownClasses(
                              countdown.tone,
                            )}`}
                          >
                            {countdown.label}
                          </span>
                        </div>

                        <div className="grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-2">
                          <p>
                            <span className="font-semibold text-[var(--foreground)]">
                              Salon:
                            </span>{" "}
                            {booking.salon.name}
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--foreground)]">
                              Price:
                            </span>{" "}
                            ${booking.finalPrice.toFixed(2)}
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--foreground)]">
                              Date:
                            </span>{" "}
                            {formatBookingDate(booking.bookingDate)}
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--foreground)]">
                              Time:
                            </span>{" "}
                            {booking.startTime} - {booking.endTime}
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--foreground)]">
                              Duration:
                            </span>{" "}
                            {booking.service.duration} min
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--foreground)]">
                              Promo:
                            </span>{" "}
                            {booking.appliedPromoCode ?? "None"}
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--foreground)]">
                              Requested:
                            </span>{" "}
                            {formatCreatedAt(booking.createdAt)}
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--foreground)]">
                              Discount:
                            </span>{" "}
                            {booking.discountAmount > 0
                              ? `$${booking.discountAmount.toFixed(2)} off from $${booking.originalPrice.toFixed(2)}`
                              : "No promo discount"}
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--foreground)]">
                              Location:
                            </span>{" "}
                            {locationLabel ?? "Not shared yet"}
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--foreground)]">
                              First confirmation:
                            </span>{" "}
                            {booking.firstConfirmedAt
                              ? formatCreatedAt(booking.firstConfirmedAt)
                              : "Waiting"}
                          </p>
                          <p>
                            <span className="font-semibold text-[var(--foreground)]">
                              Final confirmation:
                            </span>{" "}
                            {booking.finalConfirmedAt
                              ? formatCreatedAt(booking.finalConfirmedAt)
                              : booking.reminderSentAt
                                ? "Reminder sent, waiting for you"
                                : "Not opened yet"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="print-hidden flex flex-col gap-3 sm:flex-row lg:flex-col">
                      <Link
                        className="inline-flex justify-center rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
                        href={`/salon/${booking.salon.slug}`}
                      >
                        Open salon page
                      </Link>
                      {mapsUrl ? (
                        <Link
                          className="inline-flex justify-center rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                          href={mapsUrl}
                          target="_blank"
                        >
                          Open in Maps
                        </Link>
                      ) : null}
                      {whatsappUrl ? (
                        <Link
                          className="inline-flex justify-center rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                          href={whatsappUrl}
                          target="_blank"
                        >
                          WhatsApp salon
                        </Link>
                      ) : null}
                      {callUrl ? (
                        <Link
                          className="inline-flex justify-center rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                          href={callUrl}
                        >
                          Call salon
                        </Link>
                      ) : null}
                      <button
                        className="inline-flex justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={confirmDisabled || isActionPending}
                        onClick={() =>
                          runBookingAction(booking.id, "CONFIRM_ATTENDING")
                        }
                        type="button"
                      >
                        {isActionPending &&
                        pendingAction === "CONFIRM_ATTENDING"
                          ? "Saving..."
                          : booking.clientConfirmationStage ===
                              ClientConfirmationStage.FINAL_CONFIRMED
                            ? "Already confirmed"
                            : getConfirmButtonLabel(booking)}
                      </button>
                      <button
                        className="inline-flex justify-center rounded-full border border-fuchsia-200 bg-fuchsia-50 px-4 py-2 text-sm font-semibold text-fuchsia-700 transition hover:border-fuchsia-300 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!canInteract || isActionPending}
                        onClick={() =>
                          runBookingAction(booking.id, "REQUEST_RESCHEDULE")
                        }
                        type="button"
                      >
                        {isActionPending &&
                        pendingAction === "REQUEST_RESCHEDULE"
                          ? "Saving..."
                          : "Need reschedule"}
                      </button>
                      <button
                        className="inline-flex justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!canInteract || isActionPending}
                        onClick={() =>
                          runBookingAction(booking.id, "CANCEL_BOOKING")
                        }
                        type="button"
                      >
                        {isActionPending && pendingAction === "CANCEL_BOOKING"
                          ? "Saving..."
                          : "Cancel booking"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-[var(--border)] bg-white/70 px-5 py-5">
              <p className="text-lg font-semibold text-[var(--foreground)]">
                No bookings yet.
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Once you reserve a haircut or any service, it will appear here
                with the status, price, countdown, and confirmation actions
                before the appointment.
              </p>
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
