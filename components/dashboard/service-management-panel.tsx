"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

type ServiceRecord = {
  bookingsCount: number;
  description: null | string;
  duration: number;
  id: string;
  loyaltyPoints: number;
  name: string;
  price: number;
};

type ServiceManagementPanelProps = {
  initialServices: ServiceRecord[];
};

export function ServiceManagementPanel({
  initialServices,
}: ServiceManagementPanelProps) {
  const router = useRouter();
  const [services, setServices] = useState(initialServices);
  const [editingServiceId, setEditingServiceId] = useState<null | string>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [loyaltyPoints, setLoyaltyPoints] = useState("");
  const [feedback, setFeedback] = useState<null | {
    message: string;
    tone: "error" | "success";
  }>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<null | string>(null);
  const [isPending, startTransition] = useTransition();

  function resetForm() {
    setEditingServiceId(null);
    setName("");
    setDescription("");
    setPrice("");
    setDuration("");
    setLoyaltyPoints("");
  }

  function beginEditing(service: ServiceRecord) {
    setFeedback(null);
    setEditingServiceId(service.id);
    setName(service.name);
    setDescription(service.description ?? "");
    setPrice(service.price.toString());
    setDuration(service.duration.toString());
    setLoyaltyPoints(service.loyaltyPoints.toString());
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      try {
        const response = await fetch(
          editingServiceId
            ? `/api/dashboard/services/${editingServiceId}`
            : "/api/dashboard/services",
          {
            method: editingServiceId ? "PUT" : "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name,
              description,
              price,
              duration,
              loyaltyPoints,
            }),
          },
        );

        const payload = (await response.json()) as {
          error?: string;
          service?: ServiceRecord;
        };

        if (!response.ok || !payload.service) {
          setFeedback({
            tone: "error",
            message:
              payload.error ?? "We could not save that service right now.",
          });
          return;
        }

        const nextService = payload.service;

        setServices((currentServices) => {
          if (editingServiceId) {
            return currentServices.map((service) =>
              service.id === nextService.id ? nextService : service,
            );
          }

          return [...currentServices, nextService].sort((first, second) =>
            first.name.localeCompare(second.name),
          );
        });

        setFeedback({
          tone: "success",
          message: editingServiceId
            ? "Service updated successfully."
            : "Service created successfully.",
        });
        resetForm();
        router.refresh();
      } catch {
        setFeedback({
          tone: "error",
          message: "We could not reach the server. Please try again.",
        });
      }
    });
  }

  function handleDelete(serviceId: string) {
    setFeedback(null);
    setPendingDeleteId(serviceId);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/dashboard/services/${serviceId}`, {
          method: "DELETE",
        });

        const payload = (await response.json()) as {
          error?: string;
          ok?: boolean;
        };

        if (!response.ok) {
          setFeedback({
            tone: "error",
            message:
              payload.error ?? "We could not delete that service right now.",
          });
          setPendingDeleteId(null);
          return;
        }

        setServices((currentServices) =>
          currentServices.filter((service) => service.id !== serviceId),
        );

        if (editingServiceId === serviceId) {
          resetForm();
        }

        setFeedback({
          tone: "success",
          message: "Service deleted successfully.",
        });
        setPendingDeleteId(null);
        router.refresh();
      } catch {
        setFeedback({
          tone: "error",
          message: "We could not reach the server. Please try again.",
        });
        setPendingDeleteId(null);
      }
    });
  }

  return (
    <article className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[var(--accent)]">
          Day 6 Service Management
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
          Add, edit, and remove salon services.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)]">
          Each service feeds the public booking page. Keep the catalog current
          here so clients always book the right duration and price.
        </p>
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

      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Service name
            </span>
            <input
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(181,84,49,0.15)]"
              onChange={(event) => setName(event.target.value)}
              placeholder="Signature Haircut"
              required
              type="text"
              value={name}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Duration (minutes)
            </span>
            <input
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(181,84,49,0.15)]"
              min="5"
              onChange={(event) => setDuration(event.target.value)}
              placeholder="60"
              required
              step="5"
              type="number"
              value={duration}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_0.35fr_0.35fr]">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Description
            </span>
            <textarea
              className="min-h-[120px] w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(181,84,49,0.15)]"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe what is included in this service."
              value={description}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Price (MAD)
            </span>
            <input
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(181,84,49,0.15)]"
              min="0"
              onChange={(event) => setPrice(event.target.value)}
              placeholder="30"
              required
              step="0.01"
              type="number"
              value={price}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--foreground)]">
              Loyalty points
            </span>
            <input
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[rgba(181,84,49,0.15)]"
              min="0"
              onChange={(event) => setLoyaltyPoints(event.target.value)}
              placeholder="10"
              required
              step="1"
              type="number"
              value={loyaltyPoints}
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="inline-flex justify-center rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending}
            type="submit"
          >
            {isPending
              ? editingServiceId
                ? "Saving service..."
                : "Creating service..."
              : editingServiceId
                ? "Save service changes"
                : "Add service"}
          </button>

          {editingServiceId ? (
            <button
              className="inline-flex justify-center rounded-full border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              onClick={resetForm}
              type="button"
            >
              Cancel editing
            </button>
          ) : null}
        </div>
      </form>

      <div className="mt-6 space-y-4">
        {services.length ? (
          services.map((service) => {
            const isDeletePending = isPending && pendingDeleteId === service.id;

            return (
              <div
                className="rounded-[1.5rem] border border-[var(--border)] bg-white/80 p-5"
                key={service.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-lg font-semibold text-[var(--foreground)]">
                        {service.name}
                      </p>
                      <span className="rounded-full bg-[rgba(181,84,49,0.10)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                        MAD {service.price.toFixed(2)}
                      </span>
                      <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
                        {service.loyaltyPoints} pts
                      </span>
                    </div>

                    <p className="text-sm leading-6 text-[var(--muted)]">
                      {service.description ?? "No description provided yet."}
                    </p>

                    <div className="flex flex-wrap gap-3 text-sm text-[var(--muted)]">
                      <span>{service.duration} min</span>
                      <span>{service.bookingsCount} linked booking{service.bookingsCount === 1 ? "" : "s"}</span>
                      <span>Rewards {service.loyaltyPoints} loyalty points</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                    <button
                      className="inline-flex justify-center rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
                      onClick={() => beginEditing(service)}
                      type="button"
                    >
                      Edit
                    </button>
                    <button
                      className="inline-flex justify-center rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-rose-300 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isDeletePending}
                      onClick={() => handleDelete(service.id)}
                      type="button"
                    >
                      {isDeletePending ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-[var(--border)] bg-white/70 px-5 py-5">
            <p className="text-sm leading-6 text-[var(--muted)]">
              No services yet. Add the first one above and it will appear on the
              public booking page immediately.
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
