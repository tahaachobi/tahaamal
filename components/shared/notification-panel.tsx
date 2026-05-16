type NotificationPanelProps = {
  description: string;
  emptyMessage: string;
  notifications: Array<{
    createdAt: string;
    id: string;
    message: string;
    title: string;
    type: string;
  }>;
  title: string;
};

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function badgeClasses(type: string) {
  switch (type) {
    case "BOOKING_REMINDER":
      return "border border-amber-200 bg-amber-50 text-amber-700";
    case "RESCHEDULE_REQUEST":
      return "border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700";
    case "BOOKING_STATUS":
      return "border border-sky-200 bg-sky-50 text-sky-700";
    case "CLIENT_CONFIRMATION":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case "LOYALTY_UPDATE":
      return "border border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border border-stone-200 bg-stone-100 text-stone-700";
  }
}

function badgeLabel(type: string) {
  switch (type) {
    case "BOOKING_REMINDER":
      return "Reminder";
    case "RESCHEDULE_REQUEST":
      return "Reschedule";
    case "BOOKING_STATUS":
      return "Status";
    case "CLIENT_CONFIRMATION":
      return "Confirmation";
    case "LOYALTY_UPDATE":
      return "Loyalty";
    default:
      return "Booking";
  }
}

export function NotificationPanel({
  description,
  emptyMessage,
  notifications,
  title,
}: NotificationPanelProps) {
  return (
    <article className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[var(--accent)]">
          Notification Center
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
          {title}
        </h2>
        <p className="max-w-2xl text-sm leading-7 text-[var(--muted)]">
          {description}
        </p>
      </div>

      <div className="mt-5 space-y-3">
        {notifications.length ? (
          notifications.map((notification) => (
            <div
              className="rounded-[1.35rem] border border-[var(--border)] bg-white/80 px-4 py-4"
              key={notification.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {notification.title}
                </p>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${badgeClasses(
                    notification.type,
                  )}`}
                >
                  {badgeLabel(notification.type)}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {notification.message}
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
                {formatCreatedAt(notification.createdAt)}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-[var(--border)] bg-white/70 px-5 py-5">
            <p className="text-sm leading-6 text-[var(--muted)]">{emptyMessage}</p>
          </div>
        )}
      </div>
    </article>
  );
}
