"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  BookingStatus,
  ClientConfirmationStage,
} from "@/app/generated/prisma/enums";
import { buildCallUrl, buildWhatsAppUrl } from "@/lib/contact";
import {
  getOwnerBookingTimingState,
  LATE_THRESHOLD_MINUTES,
  NO_SHOW_THRESHOLD_MINUTES,
} from "@/lib/owner-booking";
import {
  confirmationStageClasses,
  formatConfirmationStage,
} from "@/lib/booking-confirmation";

type BookingRecord = {
  appliedPromoCode: null | string;
  clientEmail: string;
  clientPhone: null | string;
  clientConfirmationStage: ClientConfirmationStage;
  clientLoyaltyPoints: number;
  clientName: string;
  clientTrustStars: number;
  createdAt: string;
  date: string;
  discountAmount: number;
  endTime: string;
  finalConfirmedAt: null | string;
  finalPrice: number;
  firstConfirmedAt: null | string;
  id: string;
  originalPrice: number;
  reminderSentAt: null | string;
  serviceName: string;
  startTime: string;
  status: BookingStatus;
};

type BookingManagementPanelProps = {
  initialBookings: BookingRecord[];
};

type BookingFilterStatus = "ALL" | BookingStatus;

const statusOptions: BookingFilterStatus[] = [
  "ALL",
  BookingStatus.PENDING,
  BookingStatus.CONFIRMED,
  BookingStatus.COMPLETED,
  BookingStatus.NO_SHOW,
  BookingStatus.CANCELLED,
];

function formatDateLabel(value: string) {
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
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCompactCountdown(minutesUntilStart: number) {
  if (minutesUntilStart <= 0) {
    return "Due now";
  }

  const hours = Math.floor(minutesUntilStart / 60);
  const minutes = minutesUntilStart % 60;

  if (hours <= 0) {
    return `${minutes}m left`;
  }

  return `${hours}h ${minutes}m left`;
}

function getTodayKey(nowMs: number) {
  const now = new Date(nowMs);

  return [
    now.getFullYear(),
    (now.getMonth() + 1).toString().padStart(2, "0"),
    now.getDate().toString().padStart(2, "0"),
  ].join("-");
}

function statusClasses(status: BookingStatus) {
  switch (status) {
    case BookingStatus.CONFIRMED:
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case BookingStatus.COMPLETED:
      return "border border-sky-200 bg-sky-50 text-sky-700";
    case BookingStatus.NO_SHOW:
      return "border border-rose-200 bg-rose-50 text-rose-700";
    case BookingStatus.CANCELLED:
      return "border border-stone-200 bg-stone-100 text-stone-600";
    default:
      return "border border-amber-200 bg-amber-50 text-amber-700";
  }
}

function timerClasses(tone: ReturnType<typeof getOwnerBookingTimingState>["tone"]) {
  switch (tone) {
    case "good":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case "warn":
      return "border border-amber-200 bg-amber-50 text-amber-700";
    case "danger":
      return "border border-rose-200 bg-rose-50 text-rose-700";
    case "muted":
      return "border border-stone-200 bg-stone-100 text-stone-600";
    default:
      return "border border-[var(--border)] bg-white text-[var(--foreground)]";
  }
}

function trustClasses(stars: number) {
  if (stars >= 4) {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (stars >= 3) {
    return "border border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border border-rose-200 bg-rose-50 text-rose-700";
}

export function BookingManagementPanel({
  initialBookings,
}: BookingManagementPanelProps) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [statusFilter, setStatusFilter] = useState<BookingFilterStatus>("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [feedback, setFeedback] = useState<null | {
    message: string;
    tone: "error" | "success";
  }>(null);
  const [pendingBookingId, setPendingBookingId] = useState<null | string>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const orderedBookings = useMemo(() => {
    return [...bookings].sort((left, right) => {
      const leftKey = `${left.date}-${left.startTime}`;
      const rightKey = `${right.date}-${right.startTime}`;

      return leftKey.localeCompare(rightKey);
    });
  }, [bookings]);

  const timingStates = useMemo(() => {
    return Object.fromEntries(
      orderedBookings.map((booking) => [
        booking.id,
        getOwnerBookingTimingState({
          date: booking.date,
          endTime: booking.endTime,
          now: new Date(nowMs),
          startTime: booking.startTime,
          status: booking.status,
        }),
      ]),
    ) as Record<string, ReturnType<typeof getOwnerBookingTimingState>>;
  }, [nowMs, orderedBookings]);

  const todayKey = getTodayKey(nowMs);
  const todayBookings = orderedBookings.filter((booking) => booking.date === todayKey);
  const actionableTodayBookings = todayBookings.filter(
    (booking) =>
      booking.status === BookingStatus.PENDING ||
      booking.status === BookingStatus.CONFIRMED,
  );
  const nextClient = actionableTodayBookings.find(
    (booking) =>
      timingStates[booking.id] &&
      (!timingStates[booking.id].hasEnded ||
        timingStates[booking.id].minutesUntilStart > 0),
  );

  const filteredBookings = orderedBookings.filter((booking) => {
    if (statusFilter !== "ALL" && booking.status !== statusFilter) {
      return false;
    }

    if (dateFilter && booking.date !== dateFilter) {
      return false;
    }

    return true;
  });

  const pendingCount = bookings.filter(
    (booking) => booking.status === BookingStatus.PENDING,
  ).length;
  const confirmedCount = bookings.filter(
    (booking) => booking.status === BookingStatus.CONFIRMED,
  ).length;
  const completedCount = bookings.filter(
    (booking) => booking.status === BookingStatus.COMPLETED,
  ).length;
  const lateCount = actionableTodayBookings.filter((booking) => {
    const timing = timingStates[booking.id];

    return timing.lateMinutes >= LATE_THRESHOLD_MINUTES && !timing.canMarkNoShow;
  }).length;
  const noShowWindowCount = actionableTodayBookings.filter(
    (booking) => timingStates[booking.id].canMarkNoShow,
  ).length;

  function updateBookingStatus(bookingId: string, status: BookingStatus) {
    setFeedback(null);
    setPendingBookingId(bookingId);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/dashboard/bookings/${bookingId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        });

        const payload = (await response.json()) as {
          booking?: BookingRecord;
          error?: string;
        };

        if (!response.ok || !payload.booking) {
          setFeedback({
            tone: "error",
            message:
              payload.error ?? "We could not update that booking right now.",
          });
          setPendingBookingId(null);
          return;
        }

        const nextBooking = payload.booking;

        setBookings((currentBookings) =>
          currentBookings.map((booking) =>
            booking.id === nextBooking.id ? nextBooking : booking,
          ),
        );
        setFeedback({
          tone: "success",
          message: `Booking updated to ${nextBooking.status.toLowerCase()}.`,
        });
        setPendingBookingId(null);
        router.refresh();
      } catch {
        setFeedback({
          tone: "error",
          message: "We could not reach the server. Please try again.",
        });
        setPendingBookingId(null);
      }
    });
  }

  return (
    <article className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[var(--accent)]">
            Day 2 Owner Control
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
            Monitor today&apos;s queue, late arrivals, and no-show windows.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
            Watch the next client timer, track which bookings are running late,
            and close the loop with confirmed, completed, cancelled, or no-show
            updates directly from the dashboard.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
          <div className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              Today
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {todayBookings.length}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              Late
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {lateCount}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              No-show window
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {noShowWindowCount}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
              Completed
            </p>
            <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {completedCount}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.5rem] border border-[var(--border)] bg-white/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
            Next client
          </p>
          {nextClient ? (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                  {nextClient.clientName}
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${statusClasses(
                    nextClient.status,
                  )}`}
                >
                  {nextClient.status}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${timerClasses(
                    timingStates[nextClient.id].tone,
                  )}`}
                >
                  {timingStates[nextClient.id].windowLabel}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {nextClient.serviceName} / {formatDateLabel(nextClient.date)} /{" "}
                {nextClient.startTime} - {nextClient.endTime}
              </p>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Countdown:{" "}
                <span className="font-semibold text-[var(--foreground)]">
                  {formatCompactCountdown(
                    timingStates[nextClient.id].minutesUntilStart,
                  )}
                </span>
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                No live arrivals in the queue.
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                As soon as a booking lands on today&apos;s date, the next-client
                timer will appear here with the active arrival window.
              </p>
            </>
          )}
        </div>

        <div className="rounded-[1.5rem] border border-[var(--border)] bg-[#1f1720] p-5 text-sm text-[#f5eee7]">
          <p className="font-semibold uppercase tracking-[0.2em] text-[#f2b089]">
            Timing rules
          </p>
          <div className="mt-4 space-y-3 leading-6">
            <p>
              `Late` appears after{" "}
              <span className="font-semibold">{LATE_THRESHOLD_MINUTES} minutes</span>.
            </p>
            <p>
              `No-show window` opens after{" "}
              <span className="font-semibold">
                {NO_SHOW_THRESHOLD_MINUTES} minutes
              </span>{" "}
              of delay.
            </p>
            <p>
              `Completed` is available once a confirmed booking has started.
            </p>
          </div>
        </div>
      </div>

      {feedback ? (
        <div
          className={`mt-5 rounded-2xl px-4 py-3 text-sm ${
            feedback.tone === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="mt-5 rounded-[1.5rem] border border-[var(--border)] bg-white/80 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
              Today&apos;s board
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Chronological queue for today with live arrival states.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 uppercase tracking-[0.2em] text-[var(--muted)]">
              Pending {pendingCount}
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 uppercase tracking-[0.2em] text-[var(--muted)]">
              Confirmed {confirmedCount}
            </span>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {todayBookings.length ? (
            todayBookings.map((booking) => {
              const timing = timingStates[booking.id];

              return (
                <div
                  className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                  key={`today-${booking.id}`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-semibold text-[var(--foreground)]">
                        {booking.startTime} / {booking.clientName}
                      </p>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${statusClasses(
                          booking.status,
                        )}`}
                      >
                        {booking.status}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${confirmationStageClasses(
                          booking.clientConfirmationStage,
                        )}`}
                      >
                        {formatConfirmationStage(booking.clientConfirmationStage)}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${timerClasses(
                          timing.tone,
                        )}`}
                      >
                        {timing.windowLabel}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {booking.serviceName} / {booking.clientEmail}
                      {booking.clientPhone ? ` / ${booking.clientPhone}` : ""}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${trustClasses(
                      booking.clientTrustStars,
                    )}`}
                  >
                    Trust {booking.clientTrustStars}/5
                  </span>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white/60 px-4 py-4">
              <p className="text-sm leading-6 text-[var(--muted)]">
                No bookings are scheduled for today yet.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr]">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--foreground)]">
            Filter by date
          </span>
          <input
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(181,84,49,0.15)]"
            onChange={(event) => setDateFilter(event.target.value)}
            type="date"
            value={dateFilter}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-[var(--foreground)]">
            Filter by status
          </span>
          <select
            className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(181,84,49,0.15)]"
            onChange={(event) =>
              setStatusFilter(event.target.value as BookingFilterStatus)
            }
            value={statusFilter}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status === "ALL" ? "All statuses" : status}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-5 space-y-4">
        {filteredBookings.length ? (
          filteredBookings.map((booking) => {
            const timing = timingStates[booking.id];
            const isActionPending = isPending && pendingBookingId === booking.id;
            const canConfirm = booking.status === BookingStatus.PENDING;
            const canCancel =
              booking.status === BookingStatus.PENDING ||
              booking.status === BookingStatus.CONFIRMED;
            const canComplete =
              booking.status === BookingStatus.CONFIRMED && timing.hasStarted;
            const canMarkNoShow =
              (booking.status === BookingStatus.PENDING ||
                booking.status === BookingStatus.CONFIRMED) &&
              timing.canMarkNoShow;
            const clientWhatsAppUrl = buildWhatsAppUrl(
              booking.clientPhone,
              `Hello ${booking.clientName}, this is a reminder about your booking on ${booking.date} at ${booking.startTime}.`,
            );
            const clientCallUrl = buildCallUrl(booking.clientPhone);

            return (
              <div
                className="rounded-[1.5rem] border border-[var(--border)] bg-white/80 p-5"
                key={booking.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-lg font-semibold text-[var(--foreground)]">
                        {booking.clientName}
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
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${timerClasses(
                          timing.tone,
                        )}`}
                      >
                        {timing.windowLabel}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${trustClasses(
                          booking.clientTrustStars,
                        )}`}
                      >
                        Trust {booking.clientTrustStars}/5
                      </span>
                    </div>

                    <div className="grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-2">
                      <p>
                        <span className="font-semibold text-[var(--foreground)]">
                          Email:
                        </span>{" "}
                        {booking.clientEmail}
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--foreground)]">
                          Phone:
                        </span>{" "}
                        {booking.clientPhone ?? "Not saved"}
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--foreground)]">
                          Service:
                        </span>{" "}
                        {booking.serviceName}
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--foreground)]">
                          Date:
                        </span>{" "}
                        {formatDateLabel(booking.date)}
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--foreground)]">
                          Time:
                        </span>{" "}
                        {booking.startTime} - {booking.endTime}
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--foreground)]">
                          Client points:
                        </span>{" "}
                        {booking.clientLoyaltyPoints}
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--foreground)]">
                          Final price:
                        </span>{" "}
                        ${booking.finalPrice.toFixed(2)}
                        {booking.discountAmount > 0
                          ? ` after $${booking.discountAmount.toFixed(2)} off`
                          : ""}
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--foreground)]">
                          Client flow:
                        </span>{" "}
                        {formatConfirmationStage(booking.clientConfirmationStage)}
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--foreground)]">
                          Requested:
                        </span>{" "}
                        {formatCreatedAt(booking.createdAt)}
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--foreground)]">
                          Promo:
                        </span>{" "}
                        {booking.appliedPromoCode ?? "None"}
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--foreground)]">
                          First confirm:
                        </span>{" "}
                        {booking.firstConfirmedAt
                          ? formatCreatedAt(booking.firstConfirmedAt)
                          : "Waiting"}
                      </p>
                      <p>
                        <span className="font-semibold text-[var(--foreground)]">
                          Final confirm:
                        </span>{" "}
                        {booking.finalConfirmedAt
                          ? formatCreatedAt(booking.finalConfirmedAt)
                          : booking.reminderSentAt
                            ? "Reminder sent"
                            : "Not reached yet"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:flex">
                    {clientWhatsAppUrl ? (
                      <Link
                        className="inline-flex justify-center rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        href={clientWhatsAppUrl}
                        target="_blank"
                      >
                        WhatsApp client
                      </Link>
                    ) : null}
                    {clientCallUrl ? (
                      <Link
                        className="inline-flex justify-center rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        href={clientCallUrl}
                      >
                        Call client
                      </Link>
                    ) : null}
                    <button
                      className="inline-flex justify-center rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!canConfirm || isActionPending}
                      onClick={() =>
                        updateBookingStatus(booking.id, BookingStatus.CONFIRMED)
                      }
                      type="button"
                    >
                      {isActionPending && canConfirm ? "Updating..." : "Confirm"}
                    </button>
                    <button
                      className="inline-flex justify-center rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!canComplete || isActionPending}
                      onClick={() =>
                        updateBookingStatus(booking.id, BookingStatus.COMPLETED)
                      }
                      type="button"
                    >
                      {isActionPending && canComplete ? "Updating..." : "Complete"}
                    </button>
                    <button
                      className="inline-flex justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!canMarkNoShow || isActionPending}
                      onClick={() =>
                        updateBookingStatus(booking.id, BookingStatus.NO_SHOW)
                      }
                      type="button"
                    >
                      {isActionPending && canMarkNoShow
                        ? "Updating..."
                        : "Mark no-show"}
                    </button>
                    <button
                      className="inline-flex justify-center rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-stone-300 hover:text-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={!canCancel || isActionPending}
                      onClick={() =>
                        updateBookingStatus(booking.id, BookingStatus.CANCELLED)
                      }
                      type="button"
                    >
                      {isActionPending && canCancel ? "Updating..." : "Cancel"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-[var(--border)] bg-white/70 px-5 py-5">
            <p className="text-sm leading-6 text-[var(--muted)]">
              No bookings match the active filters yet.
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
