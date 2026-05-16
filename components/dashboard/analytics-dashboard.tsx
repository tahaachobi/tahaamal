"use client";

import { useState, useMemo } from "react";

type Booking = {
  id: string; date: string; status: string; serviceName: string;
  staffName: string; resourceName: string; clientName: string;
  originalPrice: number; finalPrice: number; discountAmount: number;
};
type Staff = { id: string; name: string; role: string };
type Service = { id: string; name: string; price: number };
type Resource = { id: string; name: string; type: string };
type CashSession = {
  id: string; openedAt: string; closedAt: string | null; status: string;
  openingFloat: number; totalCash: number; totalCard: number;
  transactions: { id: string; method: string; amount: number; createdAt: string }[];
  movements: { id: string; type: string; amount: number; note: string | null; createdAt: string }[];
};

type Props = {
  salonName: string; bookings: Booking[]; staff: Staff[];
  services: Service[]; resources: Resource[]; cashSessions: CashSession[];
};

/* ── Mini Bar Chart ── */
function MiniBar({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 100 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--foreground)" }}>{d.value > 0 ? d.value : ""}</span>
          <div style={{
            width: "100%", height: max ? (d.value / max) * 72 : 0,
            background: d.color ?? "var(--luna-blue)", borderRadius: 4, minHeight: 2,
            transition: "height .3s ease",
          }} />
          <span style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsDashboard({ salonName, bookings, staff, cashSessions }: Omit<Props, "services" | "resources">) {
  const [tab, setTab] = useState<"overview" | "revenue" | "bookings" | "staff" | "cash">("overview");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "all">("30d");

  const filteredBookings = useMemo(() => {
    const now = new Date();
    const cutoff = dateRange === "7d" ? new Date(now.getTime() - 7 * 86400000)
      : dateRange === "30d" ? new Date(now.getTime() - 30 * 86400000) : new Date(0);
    return bookings.filter(b => new Date(b.date) >= cutoff);
  }, [bookings, dateRange]);

  // KPIs
  const totalRevenue = filteredBookings.filter(b => b.status === "COMPLETED").reduce((s, b) => s + b.finalPrice, 0);
  const totalBookings = filteredBookings.length;
  const completedBookings = filteredBookings.filter(b => b.status === "COMPLETED").length;
  const cancelledBookings = filteredBookings.filter(b => b.status === "CANCELLED").length;
  const noShowBookings = filteredBookings.filter(b => b.status === "NO_SHOW").length;
  const completionRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;
  const totalDiscount = filteredBookings.reduce((s, b) => s + b.discountAmount, 0);

  // Revenue by service
  const revenueByService = useMemo(() => {
    const map = new Map<string, number>();
    filteredBookings.filter(b => b.status === "COMPLETED").forEach(b => {
      map.set(b.serviceName, (map.get(b.serviceName) || 0) + b.finalPrice);
    });
    return Array.from(map.entries()).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredBookings]);

  // Revenue by staff
  const revenueByStaff = useMemo(() => {
    const map = new Map<string, { revenue: number; count: number }>();
    filteredBookings.filter(b => b.status === "COMPLETED").forEach(b => {
      const existing = map.get(b.staffName) || { revenue: 0, count: 0 };
      map.set(b.staffName, { revenue: existing.revenue + b.finalPrice, count: existing.count + 1 });
    });
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredBookings]);

  // Revenue by resource
  const revenueByResource = useMemo(() => {
    const map = new Map<string, number>();
    filteredBookings.filter(b => b.status === "COMPLETED" && b.resourceName !== "—").forEach(b => {
      map.set(b.resourceName, (map.get(b.resourceName) || 0) + b.finalPrice);
    });
    return Array.from(map.entries()).map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredBookings]);

  // Daily revenue chart (last 7 days)
  const dailyRevenue = useMemo(() => {
    const days: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("en-GB", { weekday: "short" });
      const rev = filteredBookings
        .filter(b => b.status === "COMPLETED" && b.date.slice(0, 10) === key)
        .reduce((s, b) => s + b.finalPrice, 0);
      days.push({ label, value: rev });
    }
    return days;
  }, [filteredBookings]);

  // Booking status distribution
  const statusDist = useMemo(() => {
    const map = new Map<string, number>();
    filteredBookings.forEach(b => map.set(b.status, (map.get(b.status) || 0) + 1));
    return Array.from(map.entries()).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
  }, [filteredBookings]);

  // Cash summary
  const cashSummary = useMemo(() => {
    const totalCash = cashSessions.reduce((s, cs) => s + cs.totalCash, 0);
    const totalCard = cashSessions.reduce((s, cs) => s + cs.totalCard, 0);
    const totalMovementsIn = cashSessions.reduce((s, cs) => s + cs.movements.filter(m => m.type === "IN").reduce((ms, m) => ms + m.amount, 0), 0);
    const totalMovementsOut = cashSessions.reduce((s, cs) => s + cs.movements.filter(m => m.type === "OUT").reduce((ms, m) => ms + m.amount, 0), 0);
    return { totalCash, totalCard, totalMovementsIn, totalMovementsOut, sessions: cashSessions.length };
  }, [cashSessions]);

  const statusColor: Record<string, string> = {
    COMPLETED: "#22c55e", CANCELLED: "#ef4444", NO_SHOW: "#64748b",
    PENDING: "#facc15", CONFIRMED: "#3b82f6", IN_SERVICE: "#6366f1",
    ACCEPTED: "#3b82f6", ARRIVING: "#f59e0b",
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "revenue", label: "Revenue" },
    { id: "bookings", label: "Bookings" },
    { id: "staff", label: "Staff Performance" },
    { id: "cash", label: "Cash Register" },
  ] as const;

  return (
    <div className="luna-stack" style={{ gap: 20 }}>
      {/* Header */}
      <div className="luna-between">
        <div>
          <h1 className="luna-h1">Analytics & Reports</h1>
          <p className="luna-text-muted" style={{ marginTop: 4, fontSize: 13 }}>{salonName} · Business Intelligence</p>
        </div>
        <div className="luna-row luna-gap-2">
          {(["7d", "30d", "all"] as const).map(r => (
            <button key={r} onClick={() => setDateRange(r)}
              className={`luna-btn luna-btn-sm ${dateRange === r ? "luna-btn-primary" : "luna-btn-secondary"}`}>
              {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "All Time"}
            </button>
          ))}
          <button className="luna-btn luna-btn-sm luna-btn-outline" style={{ gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="luna-row luna-gap-2" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: "10px 16px", fontSize: 13, fontWeight: 600, border: "none", background: "none", cursor: "pointer",
              color: tab === t.id ? "var(--luna-blue)" : "var(--muted)",
              borderBottom: tab === t.id ? "2px solid var(--luna-blue)" : "2px solid transparent",
              transition: "all .15s ease",
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <>
          <div className="luna-grid-kpi">
            <div className="luna-kpi-card">
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Total Revenue</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)" }}>MAD {totalRevenue.toLocaleString()}</p>
              <p style={{ fontSize: 12, color: "var(--luna-success)", fontWeight: 600, marginTop: 8 }}>From {completedBookings} completed</p>
            </div>
            <div className="luna-kpi-card">
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Bookings</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)" }}>{totalBookings}</p>
              <p style={{ fontSize: 12, color: "var(--luna-blue)", fontWeight: 600, marginTop: 8 }}>{completionRate}% completion rate</p>
            </div>
            <div className="luna-kpi-card">
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Cancellations</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)" }}>{cancelledBookings}</p>
              <p style={{ fontSize: 12, color: "var(--luna-error)", fontWeight: 600, marginTop: 8 }}>{noShowBookings} no-shows</p>
            </div>
            <div className="luna-kpi-card">
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Discounts Given</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)" }}>MAD {totalDiscount.toLocaleString()}</p>
              <p style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600, marginTop: 8 }}>Total discount value</p>
            </div>
          </div>

          <div className="luna-grid-responsive-2">
            <div className="luna-card luna-card-p">
              <h2 className="luna-h3" style={{ marginBottom: 16 }}>Revenue (Last 7 Days)</h2>
              <MiniBar data={dailyRevenue.map(d => ({ ...d, color: "var(--luna-blue)" }))} />
            </div>
            <div className="luna-card luna-card-p">
              <h2 className="luna-h3" style={{ marginBottom: 16 }}>Booking Status Distribution</h2>
              <div className="luna-stack" style={{ gap: 8 }}>
                {statusDist.map(s => (
                  <div key={s.status} className="luna-between" style={{ padding: "6px 0" }}>
                    <div className="luna-row luna-gap-2">
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor[s.status] || "#94a3b8" }} />
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{s.status.replace(/_/g, " ")}</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── REVENUE ── */}
      {tab === "revenue" && (
        <>
          <div className="luna-grid-responsive-2">
            <div className="luna-card luna-card-p">
              <h2 className="luna-h3" style={{ marginBottom: 16 }}>Revenue by Service</h2>
              <div className="luna-stack" style={{ gap: 10 }}>
                {revenueByService.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13 }}>No data for selected period.</p>}
                {revenueByService.map(s => {
                  const pct = totalRevenue > 0 ? (s.revenue / totalRevenue) * 100 : 0;
                  return (
                    <div key={s.name}>
                      <div className="luna-between" style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>MAD {s.revenue.toLocaleString()}</span>
                      </div>
                      <div style={{ height: 6, background: "var(--luna-gray-100)", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "var(--luna-blue)", borderRadius: 99, transition: "width .3s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="luna-card luna-card-p">
              <h2 className="luna-h3" style={{ marginBottom: 16 }}>Revenue by Resource</h2>
              <div className="luna-stack" style={{ gap: 10 }}>
                {revenueByResource.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13 }}>No data for selected period.</p>}
                {revenueByResource.map(r => {
                  const max = revenueByResource[0]?.revenue || 1;
                  const pct = (r.revenue / max) * 100;
                  return (
                    <div key={r.name}>
                      <div className="luna-between" style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>MAD {r.revenue.toLocaleString()}</span>
                      </div>
                      <div style={{ height: 6, background: "var(--luna-gray-100)", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "#6366f1", borderRadius: 99, transition: "width .3s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── BOOKINGS ── */}
      {tab === "bookings" && (
        <div className="luna-card">
          <div className="luna-card-p" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="luna-h3">All Bookings ({filteredBookings.length})</h2>
          </div>
          <div className="luna-table-wrap" style={{ border: "none", borderRadius: 0 }}>
            <table className="luna-table">
              <thead>
                <tr>
                  <th>Date</th><th>Client</th><th>Service</th><th>Staff</th><th>Resource</th><th>Price</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.slice(0, 50).map(b => (
                  <tr key={b.id}>
                    <td style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(b.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</td>
                    <td style={{ fontWeight: 600 }}>{b.clientName}</td>
                    <td>{b.serviceName}</td>
                    <td style={{ color: "var(--muted)" }}>{b.staffName}</td>
                    <td style={{ color: "var(--muted)" }}>{b.resourceName}</td>
                    <td style={{ fontWeight: 600 }}>MAD {b.finalPrice.toLocaleString()}</td>
                    <td><span className={`luna-badge ${
                      b.status === "COMPLETED" ? "luna-badge-success" :
                      b.status === "CANCELLED" ? "luna-badge-error" :
                      b.status === "PENDING" ? "luna-badge-warning" :
                      "luna-badge-info"
                    }`}>{b.status.replace(/_/g, " ")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── STAFF ── */}
      {tab === "staff" && (
        <div className="luna-card luna-card-p">
          <h2 className="luna-h3" style={{ marginBottom: 16 }}>Staff Performance</h2>
          <div className="luna-table-wrap" style={{ border: "none" }}>
            <table className="luna-table">
              <thead>
                <tr><th>Staff</th><th>Role</th><th>Clients Served</th><th>Revenue Generated</th><th>Avg per Client</th></tr>
              </thead>
              <tbody>
                {revenueByStaff.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No data for selected period.</td></tr>
                ) : (
                  revenueByStaff.map(s => (
                    <tr key={s.name}>
                      <td>
                        <div className="luna-row luna-gap-2">
                          <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700 }}>{s.name.charAt(0)}</div>
                          <span style={{ fontWeight: 600 }}>{s.name}</span>
                        </div>
                      </td>
                      <td style={{ color: "var(--muted)" }}>{staff.find(st => st.name === s.name)?.role.replace("_", " ") || "—"}</td>
                      <td style={{ fontWeight: 600 }}>{s.count}</td>
                      <td style={{ fontWeight: 700 }}>MAD {s.revenue.toLocaleString()}</td>
                      <td style={{ color: "var(--muted)" }}>MAD {s.count > 0 ? Math.round(s.revenue / s.count).toLocaleString() : "0"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CASH ── */}
      {tab === "cash" && (
        <>
          <div className="luna-grid-kpi">
            <div className="luna-kpi-card">
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Cash Sales</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)" }}>MAD {cashSummary.totalCash.toLocaleString()}</p>
            </div>
            <div className="luna-kpi-card">
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Card Sales</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)" }}>MAD {cashSummary.totalCard.toLocaleString()}</p>
            </div>
            <div className="luna-kpi-card">
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Cash In</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: "var(--luna-success)" }}>MAD {cashSummary.totalMovementsIn.toLocaleString()}</p>
            </div>
            <div className="luna-kpi-card">
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Cash Out</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: "var(--luna-error)" }}>MAD {cashSummary.totalMovementsOut.toLocaleString()}</p>
            </div>
          </div>

          <div className="luna-card">
            <div className="luna-card-p" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="luna-h3">Cash Sessions ({cashSummary.sessions})</h2>
            </div>
            <div className="luna-table-wrap" style={{ border: "none", borderRadius: 0 }}>
              <table className="luna-table">
                <thead>
                  <tr><th>Opened</th><th>Closed</th><th>Float</th><th>Cash</th><th>Card</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {cashSessions.map(cs => (
                    <tr key={cs.id}>
                      <td style={{ fontSize: 12 }}>{new Date(cs.openedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                      <td style={{ fontSize: 12, color: "var(--muted)" }}>{cs.closedAt ? new Date(cs.closedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                      <td>MAD {cs.openingFloat.toLocaleString()}</td>
                      <td style={{ fontWeight: 600 }}>MAD {cs.totalCash.toLocaleString()}</td>
                      <td style={{ fontWeight: 600 }}>MAD {cs.totalCard.toLocaleString()}</td>
                      <td><span className={`luna-badge ${cs.status === "OPEN" ? "luna-badge-success" : "luna-badge-neutral"}`}>{cs.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
