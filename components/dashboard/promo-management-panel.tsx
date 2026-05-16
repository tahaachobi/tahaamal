"use client";

import { PromoType } from "@/app/generated/prisma/enums";
import { useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";

type PromoUsageRecord = {
  createdAt: string;
  finalPrice: number;
  id: string;
  status: string;
  userEmail: string;
  userName: string;
};

type PromoRecord = {
  code: string;
  createdAt: string;
  endsAt: null | string;
  id: string;
  isActive: boolean;
  oneTimePerClient: boolean;
  recentBookings: PromoUsageRecord[];
  startsAt: null | string;
  type: PromoType;
  usageCount: number;
  usageLimit: null | number;
  value: number;
};

type ClientLoyaltyRecord = {
  email: string;
  id: string;
  loyaltyPoints: number;
  name: string;
  phone: string | null;
};

type LoyaltyHistoryEntry = {
  balanceAfter: number;
  clientId: string;
  createdAt: string;
  delta: number;
  id: string;
  note: string;
  source: "ADMIN" | "SYSTEM_NO_SHOW" | "SYSTEM_POS";
};

type PromoFormState = {
  code: string;
  endsAt: string;
  isActive: boolean;
  oneTimePerClient: boolean;
  startsAt: string;
  type: PromoType;
  usageLimit: string;
  value: string;
};

type PromoManagementPanelProps = {
  clients: ClientLoyaltyRecord[];
  initialHistoryByClient: Record<string, LoyaltyHistoryEntry[]>;
  initialPromos: PromoRecord[];
};

function formatPromoValue(type: PromoType, value: number) {
  return type === PromoType.PERCENTAGE
    ? `${value}% off`
    : `MAD ${value.toLocaleString()} off`;
}

function formatHistoryDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function historyDeltaClasses(delta: number) {
  if (delta > 0) {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (delta < 0) {
    return "border border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border border-stone-200 bg-stone-100 text-stone-700";
}

function historySourceClasses(source: LoyaltyHistoryEntry["source"]) {
  switch (source) {
    case "SYSTEM_POS":
      return "border border-sky-200 bg-sky-50 text-sky-700";
    case "SYSTEM_NO_SHOW":
      return "border border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border border-amber-200 bg-amber-50 text-amber-700";
  }
}

function historySourceLabel(source: LoyaltyHistoryEntry["source"]) {
  switch (source) {
    case "SYSTEM_POS":
      return "POS";
    case "SYSTEM_NO_SHOW":
      return "No-show";
    default:
      return "Admin";
  }
}

function buildPromoFormState(): PromoFormState {
  return {
    code: "",
    endsAt: "",
    isActive: true,
    oneTimePerClient: false,
    startsAt: "",
    type: PromoType.PERCENTAGE,
    usageLimit: "",
    value: "",
  };
}

export function PromoManagementPanel({
  clients,
  initialHistoryByClient,
  initialPromos,
}: PromoManagementPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"promos" | "loyalty">("promos");
  const [promos, setPromos] = useState(initialPromos);
  const [clientsState, setClientsState] = useState(clients);
  const [historyByClient, setHistoryByClient] = useState(initialHistoryByClient);
  const [searchQuery, setSearchQuery] = useState("");
  const [historyClientId, setHistoryClientId] = useState<null | string>(null);
  const [editingClientId, setEditingClientId] = useState<null | string>(null);
  const [isCreatePromoOpen, setIsCreatePromoOpen] = useState(false);
  const [adjustmentMode, setAdjustmentMode] = useState<
    "DECREMENT" | "INCREMENT" | "SET"
  >("INCREMENT");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [promoForm, setPromoForm] = useState(buildPromoFormState());
  const [feedback, setFeedback] = useState<null | {
    message: string;
    tone: "error" | "success";
  }>(null);
  const [isLoyaltyPending, startLoyaltyTransition] = useTransition();
  const [isPromoPending, startPromoTransition] = useTransition();

  const filteredClients = clientsState.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const maxPoints = clientsState.reduce(
    (maxValue, client) => Math.max(maxValue, client.loyaltyPoints),
    0,
  );
  const totalPoints = clientsState.reduce(
    (sum, client) => sum + client.loyaltyPoints,
    0,
  );

  const handleTogglePromo = async (promoId: string, active: boolean) => {
    const response = await fetch(`/api/dashboard/promos/${promoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: active }),
    });

    const payload = (await response.json()) as {
      promo?: PromoRecord;
    };

    if (response.ok && payload.promo) {
      setPromos((currentPromos) =>
        currentPromos.map((promo) =>
          promo.id === payload.promo?.id ? payload.promo : promo,
        ),
      );
      router.refresh();
    }
  };

  function openAdjuster(client: ClientLoyaltyRecord) {
    setEditingClientId(client.id);
    setAdjustmentMode("INCREMENT");
    setAdjustmentAmount("");
    setAdjustmentReason("");
    setFeedback(null);
  }

  function closeAdjuster() {
    setEditingClientId(null);
    setAdjustmentMode("INCREMENT");
    setAdjustmentAmount("");
    setAdjustmentReason("");
  }

  function handleLoyaltySave(client: ClientLoyaltyRecord) {
    setFeedback(null);

    startLoyaltyTransition(async () => {
      try {
        const response = await fetch("/api/dashboard/loyalty", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: adjustmentAmount,
            clientId: client.id,
            mode: adjustmentMode,
            reason: adjustmentReason,
          }),
        });

        const payload = (await response.json()) as {
          client?: ClientLoyaltyRecord;
          error?: string;
          historyEntry?: LoyaltyHistoryEntry;
          message?: string;
        };

        if (!response.ok || !payload.client) {
          setFeedback({
            message:
              payload.error ?? "We could not update that loyalty balance.",
            tone: "error",
          });
          return;
        }

        setClientsState((currentClients) =>
          currentClients
            .map((currentClient) =>
              currentClient.id === payload.client?.id
                ? payload.client
                : currentClient,
            )
            .sort((first, second) => second.loyaltyPoints - first.loyaltyPoints),
        );

        if (payload.historyEntry) {
          const historyEntry = payload.historyEntry;

          setHistoryByClient((currentHistory) => ({
            ...currentHistory,
            [client.id]: [
              historyEntry,
              ...(currentHistory[client.id] ?? []),
            ],
          }));
          setHistoryClientId(client.id);
        }

        setFeedback({
          message: payload.message ?? "Loyalty balance updated successfully.",
          tone: "success",
        });
        closeAdjuster();
        router.refresh();
      } catch {
        setFeedback({
          message: "We could not reach the server. Please try again.",
          tone: "error",
        });
      }
    });
  }

  function handleCreatePromo() {
    setFeedback(null);

    startPromoTransition(async () => {
      try {
        const response = await fetch("/api/dashboard/promos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: promoForm.code,
            endsAt: promoForm.endsAt,
            isActive: promoForm.isActive,
            oneTimePerClient: promoForm.oneTimePerClient,
            startsAt: promoForm.startsAt,
            type: promoForm.type,
            usageLimit: promoForm.usageLimit,
            value: promoForm.value,
          }),
        });

        const payload = (await response.json()) as {
          error?: string;
          promo?: PromoRecord;
        };

        if (!response.ok || !payload.promo) {
          setFeedback({
            message: payload.error ?? "We could not create that promo code.",
            tone: "error",
          });
          return;
        }

        setPromos((currentPromos) => [payload.promo!, ...currentPromos]);
        setPromoForm(buildPromoFormState());
        setIsCreatePromoOpen(false);
        setFeedback({
          message: "Promo code created successfully.",
          tone: "success",
        });
        router.refresh();
      } catch {
        setFeedback({
          message: "We could not reach the server. Please try again.",
          tone: "error",
        });
      }
    });
  }

  return (
    <div className="luna-stack" style={{ gap: 24 }}>
      <div
        className="luna-row luna-gap-2"
        style={{
          background: "var(--luna-gray-100)",
          padding: 4,
          borderRadius: 10,
          width: "fit-content",
        }}
      >
        <button
          onClick={() => setActiveTab("promos")}
          className={`luna-btn luna-btn-sm ${activeTab === "promos" ? "luna-btn-primary" : "luna-btn-secondary"}`}
          style={{
            border: "none",
            boxShadow: activeTab === "promos" ? "var(--shadow-sm)" : "none",
          }}
        >
          Promo Codes
        </button>
        <button
          onClick={() => setActiveTab("loyalty")}
          className={`luna-btn luna-btn-sm ${activeTab === "loyalty" ? "luna-btn-primary" : "luna-btn-secondary"}`}
          style={{
            border: "none",
            boxShadow: activeTab === "loyalty" ? "var(--shadow-sm)" : "none",
          }}
        >
          Loyalty Points
        </button>
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

      {activeTab === "promos" && (
        <div className="luna-stack" style={{ gap: 20 }}>
          <div className="luna-between">
            <div>
              <h2 className="luna-h3">Active Promotions</h2>
              <p className="luna-text-muted" style={{ marginTop: 4, fontSize: 12 }}>
                Create promo codes, set date windows, and manage one-time redemptions.
              </p>
            </div>
            <button
              className="luna-btn luna-btn-primary"
              onClick={() => setIsCreatePromoOpen((currentValue) => !currentValue)}
              type="button"
            >
              {isCreatePromoOpen ? "Close Form" : "+ Create Promo"}
            </button>
          </div>

          {isCreatePromoOpen ? (
            <div className="luna-card luna-card-p">
              <div
                style={{
                  display: "grid",
                  gap: 14,
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                }}
              >
                <label className="luna-stack" style={{ gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
                    Promo code
                  </span>
                  <input
                    className="luna-input"
                    onChange={(event) =>
                      setPromoForm((currentForm) => ({
                        ...currentForm,
                        code: event.target.value,
                      }))
                    }
                    placeholder="WELCOME20"
                    type="text"
                    value={promoForm.code}
                  />
                </label>

                <label className="luna-stack" style={{ gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
                    Discount type
                  </span>
                  <select
                    className="luna-input"
                    onChange={(event) =>
                      setPromoForm((currentForm) => ({
                        ...currentForm,
                        type: event.target.value as PromoType,
                      }))
                    }
                    value={promoForm.type}
                  >
                    <option value={PromoType.PERCENTAGE}>Percentage</option>
                    <option value={PromoType.FIXED}>Fixed amount</option>
                  </select>
                </label>

                <label className="luna-stack" style={{ gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
                    Discount value
                  </span>
                  <input
                    className="luna-input"
                    min="0"
                    onChange={(event) =>
                      setPromoForm((currentForm) => ({
                        ...currentForm,
                        value: event.target.value,
                      }))
                    }
                    placeholder={promoForm.type === PromoType.PERCENTAGE ? "20" : "40"}
                    step="0.01"
                    type="number"
                    value={promoForm.value}
                  />
                </label>

                <label className="luna-stack" style={{ gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
                    Usage limit
                  </span>
                  <input
                    className="luna-input"
                    min="1"
                    onChange={(event) =>
                      setPromoForm((currentForm) => ({
                        ...currentForm,
                        usageLimit: event.target.value,
                      }))
                    }
                    placeholder="Optional"
                    step="1"
                    type="number"
                    value={promoForm.usageLimit}
                  />
                </label>

                <label className="luna-stack" style={{ gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
                    Start date
                  </span>
                  <input
                    className="luna-input"
                    onChange={(event) =>
                      setPromoForm((currentForm) => ({
                        ...currentForm,
                        startsAt: event.target.value,
                      }))
                    }
                    type="date"
                    value={promoForm.startsAt}
                  />
                </label>

                <label className="luna-stack" style={{ gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
                    End date
                  </span>
                  <input
                    className="luna-input"
                    onChange={(event) =>
                      setPromoForm((currentForm) => ({
                        ...currentForm,
                        endsAt: event.target.value,
                      }))
                    }
                    type="date"
                    value={promoForm.endsAt}
                  />
                </label>
              </div>

              <div className="luna-row luna-gap-2" style={{ flexWrap: "wrap", marginTop: 16 }}>
                <label className="luna-row luna-gap-2" style={{ alignItems: "center" }}>
                  <input
                    checked={promoForm.oneTimePerClient}
                    onChange={(event) =>
                      setPromoForm((currentForm) => ({
                        ...currentForm,
                        oneTimePerClient: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  <span style={{ fontSize: 13, color: "var(--foreground)" }}>
                    One-time per client
                  </span>
                </label>
                <label className="luna-row luna-gap-2" style={{ alignItems: "center" }}>
                  <input
                    checked={promoForm.isActive}
                    onChange={(event) =>
                      setPromoForm((currentForm) => ({
                        ...currentForm,
                        isActive: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  <span style={{ fontSize: 13, color: "var(--foreground)" }}>
                    Active now
                  </span>
                </label>
              </div>

              <div className="luna-row luna-gap-2" style={{ marginTop: 18 }}>
                <button
                  className="luna-btn luna-btn-primary"
                  disabled={isPromoPending}
                  onClick={handleCreatePromo}
                  type="button"
                >
                  {isPromoPending ? "Creating..." : "Create promo"}
                </button>
                <button
                  className="luna-btn luna-btn-secondary"
                  onClick={() => {
                    setPromoForm(buildPromoFormState());
                    setIsCreatePromoOpen(false);
                  }}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          <div className="luna-grid-responsive-2">
            {promos.map((promo) => (
              <div
                key={promo.id}
                className="luna-card luna-card-p"
                style={{ opacity: promo.isActive ? 1 : 0.6 }}
              >
                <div className="luna-between" style={{ marginBottom: 12 }}>
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: "var(--luna-blue)",
                      letterSpacing: "1px",
                    }}
                  >
                    {promo.code}
                  </span>
                  <label className="luna-switch">
                    <input
                      type="checkbox"
                      checked={promo.isActive}
                      onChange={(event) =>
                        handleTogglePromo(promo.id, event.target.checked)
                      }
                    />
                    <span className="luna-slider"></span>
                  </label>
                </div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>
                  {formatPromoValue(promo.type, promo.value)}
                </p>
                <div
                  className="luna-between"
                  style={{
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {promo.usageCount} uses
                  </span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    Ends:{" "}
                    {promo.endsAt
                      ? new Date(promo.endsAt).toLocaleDateString()
                      : "Never"}
                  </span>
                </div>
              </div>
            ))}
            {promos.length === 0 ? (
              <div className="luna-card luna-card-p">
                <p className="luna-text-muted" style={{ fontSize: 13 }}>
                  No promo codes yet. Create the first one to start offering discounts.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {activeTab === "loyalty" && (
        <div className="luna-stack" style={{ gap: 24 }}>
          <div className="luna-grid-responsive-2">
            <div
              className="luna-card luna-card-p"
              style={{
                background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)",
              }}
            >
              <p
                className="luna-text-muted"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                Total Points Issued
              </p>
              <p className="luna-h1" style={{ color: "var(--luna-blue)", marginTop: 4 }}>
                {totalPoints.toLocaleString()}{" "}
                <span style={{ fontSize: 14, fontWeight: 400 }}>pts</span>
              </p>
            </div>
            <div
              className="luna-card luna-card-p"
              style={{
                background: "linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)",
              }}
            >
              <p
                className="luna-text-muted"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                Top Client Tier
              </p>
              <p className="luna-h1" style={{ color: "#d97706", marginTop: 4 }}>
                {maxPoints.toLocaleString()}{" "}
                <span style={{ fontSize: 14, fontWeight: 400 }}>pts max</span>
              </p>
            </div>
          </div>

          <div className="luna-card">
            <div
              className="luna-card-p"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="luna-between">
                <div>
                  <h2 className="luna-h3">Client Loyalty Registry</h2>
                  <p
                    className="luna-text-muted"
                    style={{ marginTop: 4, fontSize: 12 }}
                  >
                    History shows every POS reward, owner edit, and no-show penalty.
                  </p>
                </div>
                <div style={{ position: "relative", width: 240 }}>
                  <input
                    type="text"
                    className="luna-input"
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    style={{ paddingLeft: 32 }}
                  />
                  <svg
                    style={{
                      position: "absolute",
                      left: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--luna-gray-400)"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="luna-table-wrap" style={{ border: "none" }}>
              <table className="luna-table">
                <thead>
                  <tr>
                    <th>Client Name</th>
                    <th>Contact Info</th>
                    <th>Loyalty Balance</th>
                    <th>Tier</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => {
                    const clientHistory = historyByClient[client.id] ?? [];

                    return (
                      <Fragment key={client.id}>
                        <tr>
                          <td>
                            <span style={{ fontWeight: 600 }}>{client.name}</span>
                          </td>
                          <td>
                            <div className="luna-stack" style={{ gap: 2 }}>
                              <span style={{ fontSize: 12 }}>{client.email}</span>
                              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                                {client.phone || "No phone"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                color: "var(--luna-blue)",
                                fontWeight: 700,
                                fontSize: 15,
                              }}
                            >
                              {client.loyaltyPoints.toLocaleString()}{" "}
                              <span style={{ fontSize: 11, fontWeight: 400 }}>
                                pts
                              </span>
                            </span>
                          </td>
                          <td>
                            {client.loyaltyPoints >= 2000 ? (
                              <span className="luna-badge luna-badge-success">
                                Gold
                              </span>
                            ) : client.loyaltyPoints >= 1000 ? (
                              <span
                                className="luna-badge"
                                style={{ background: "#e2e8f0", color: "#475569" }}
                              >
                                Silver
                              </span>
                            ) : (
                              <span
                                className="luna-badge"
                                style={{ background: "#fef3c7", color: "#92400e" }}
                              >
                                Bronze
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div
                              className="luna-row luna-gap-2"
                              style={{ justifyContent: "flex-end", flexWrap: "wrap" }}
                            >
                              <button
                                className="luna-btn luna-btn-sm luna-btn-secondary"
                                onClick={() =>
                                  setHistoryClientId((currentValue) =>
                                    currentValue === client.id ? null : client.id,
                                  )
                                }
                                type="button"
                              >
                                History
                              </button>
                              <button
                                className="luna-btn luna-btn-sm luna-btn-secondary"
                                onClick={() =>
                                  editingClientId === client.id
                                    ? closeAdjuster()
                                    : openAdjuster(client)
                                }
                                type="button"
                              >
                                {editingClientId === client.id ? "Close" : "Adjust"}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {historyClientId === client.id ? (
                          <tr>
                            <td colSpan={5} style={{ padding: 0 }}>
                              <div
                                style={{
                                  background: "#f8fafc",
                                  borderTop: "1px solid var(--border)",
                                  padding: 20,
                                }}
                              >
                                <div className="luna-stack" style={{ gap: 12 }}>
                                  <p style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)" }}>
                                    Loyalty history
                                  </p>
                                  {clientHistory.length ? (
                                    clientHistory.map((entry) => (
                                      <div
                                        key={entry.id}
                                        className="luna-between"
                                        style={{
                                          alignItems: "flex-start",
                                          gap: 14,
                                          padding: "12px 14px",
                                          borderRadius: 14,
                                          border: "1px solid var(--border)",
                                          background: "white",
                                        }}
                                      >
                                        <div className="luna-stack" style={{ gap: 6 }}>
                                          <div className="luna-row luna-gap-2" style={{ flexWrap: "wrap" }}>
                                            <span
                                              className={historySourceClasses(entry.source)}
                                              style={{
                                                borderRadius: 999,
                                                padding: "4px 10px",
                                                fontSize: 11,
                                                fontWeight: 700,
                                                textTransform: "uppercase",
                                                letterSpacing: ".08em",
                                              }}
                                            >
                                              {historySourceLabel(entry.source)}
                                            </span>
                                            <span
                                              className={historyDeltaClasses(entry.delta)}
                                              style={{
                                                borderRadius: 999,
                                                padding: "4px 10px",
                                                fontSize: 11,
                                                fontWeight: 700,
                                              }}
                                            >
                                              {entry.delta > 0 ? "+" : ""}
                                              {entry.delta} pts
                                            </span>
                                          </div>
                                          <p style={{ fontSize: 13, color: "var(--foreground)" }}>
                                            {entry.note}
                                          </p>
                                          <p style={{ fontSize: 12, color: "var(--muted)" }}>
                                            Balance after action: {entry.balanceAfter} pts
                                          </p>
                                        </div>
                                        <p style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>
                                          {formatHistoryDate(entry.createdAt)}
                                        </p>
                                      </div>
                                    ))
                                  ) : (
                                    <div
                                      style={{
                                        borderRadius: 14,
                                        border: "1px dashed var(--border)",
                                        background: "white",
                                        padding: 16,
                                      }}
                                    >
                                      <p style={{ fontSize: 13, color: "var(--muted)" }}>
                                        No loyalty history yet for this client.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}

                        {editingClientId === client.id ? (
                          <tr>
                            <td colSpan={5} style={{ padding: 0 }}>
                              <div
                                style={{
                                  background: "#f8fafc",
                                  borderTop: "1px solid var(--border)",
                                  padding: 20,
                                }}
                              >
                                <div className="luna-stack" style={{ gap: 16 }}>
                                  <div
                                    className="luna-row luna-gap-2"
                                    style={{ flexWrap: "wrap" }}
                                  >
                                    {[
                                      { label: "Add points", value: "INCREMENT" },
                                      {
                                        label: "Remove points",
                                        value: "DECREMENT",
                                      },
                                      { label: "Set balance", value: "SET" },
                                    ].map((option) => (
                                      <button
                                        key={option.value}
                                        className={`luna-btn luna-btn-sm ${
                                          adjustmentMode === option.value
                                            ? "luna-btn-primary"
                                            : "luna-btn-secondary"
                                        }`}
                                        onClick={() =>
                                          setAdjustmentMode(
                                            option.value as
                                              | "DECREMENT"
                                              | "INCREMENT"
                                              | "SET",
                                          )
                                        }
                                        type="button"
                                      >
                                        {option.label}
                                      </button>
                                    ))}
                                  </div>

                                  <div
                                    style={{
                                      display: "grid",
                                      gap: 12,
                                      gridTemplateColumns:
                                        "minmax(180px, 220px) minmax(0, 1fr)",
                                    }}
                                  >
                                    <label className="luna-stack" style={{ gap: 6 }}>
                                      <span
                                        style={{
                                          fontSize: 12,
                                          fontWeight: 600,
                                          color: "var(--muted)",
                                          textTransform: "uppercase",
                                        }}
                                      >
                                        Amount
                                      </span>
                                      <input
                                        className="luna-input"
                                        min="0"
                                        onChange={(event) =>
                                          setAdjustmentAmount(event.target.value)
                                        }
                                        placeholder="0"
                                        step="1"
                                        type="number"
                                        value={adjustmentAmount}
                                      />
                                    </label>

                                    <label className="luna-stack" style={{ gap: 6 }}>
                                      <span
                                        style={{
                                          fontSize: 12,
                                          fontWeight: 600,
                                          color: "var(--muted)",
                                          textTransform: "uppercase",
                                        }}
                                      >
                                        Internal note
                                      </span>
                                      <input
                                        className="luna-input"
                                        onChange={(event) =>
                                          setAdjustmentReason(event.target.value)
                                        }
                                        placeholder="Optional reason for the audit trail"
                                        type="text"
                                        value={adjustmentReason}
                                      />
                                    </label>
                                  </div>

                                  <div className="luna-between" style={{ gap: 12 }}>
                                    <p
                                      className="luna-text-muted"
                                      style={{ fontSize: 12 }}
                                    >
                                      Current balance:{" "}
                                      {client.loyaltyPoints.toLocaleString()} pts
                                    </p>
                                    <div
                                      className="luna-row luna-gap-2"
                                      style={{ justifyContent: "flex-end" }}
                                    >
                                      <button
                                        className="luna-btn luna-btn-secondary"
                                        onClick={closeAdjuster}
                                        type="button"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        className="luna-btn luna-btn-primary"
                                        disabled={isLoyaltyPending}
                                        onClick={() => handleLoyaltySave(client)}
                                        type="button"
                                      >
                                        {isLoyaltyPending
                                          ? "Saving..."
                                          : "Save loyalty update"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}

                  {filteredClients.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          textAlign: "center",
                          padding: "40px 0",
                          color: "var(--muted)",
                        }}
                      >
                        No clients found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
