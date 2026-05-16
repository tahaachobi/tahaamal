"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ── Mini sparkline SVG ── */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 80, h = 32;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ── KPI Card ── */
function KpiCard({
  label, value, sub, trend, sparkline, color, icon,
}: {
  label: string; value: string; sub: string;
  trend: "up" | "down" | "neutral";
  sparkline: number[]; color: string; icon: React.ReactNode;
}) {
  const trendColor = trend === "up" ? "#16a34a" : trend === "down" ? "#dc2626" : "#64748b";
  return (
    <div className="luna-kpi-card">
      <div className="luna-between" style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em" }}>
          {label}
        </p>
        <div style={{ width: 34, height: 34, background: color + "18", borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center", color }}>
          {icon}
        </div>
      </div>
      <p style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", color: "var(--foreground)", lineHeight: 1 }}>
        {value}
      </p>
      <div className="luna-between" style={{ marginTop: 12 }}>
        <p style={{ fontSize: 12, color: trendColor, fontWeight: 600 }}>{sub}</p>
        <Sparkline values={sparkline} color={color} />
      </div>
    </div>
  );
}

/* ── Status badge ── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "luna-badge-warning",
    CONFIRMED: "luna-badge-info",
    ACCEPTED: "luna-badge-info",
    COMPLETED: "luna-badge-success",
    CANCELLED: "luna-badge-error",
    NO_SHOW: "luna-badge-neutral",
    IN_SERVICE: "luna-badge-blue",
  };
  return <span className={`luna-badge ${map[status] ?? "luna-badge-neutral"}`}>{status.replace(/_/g, " ")}</span>;
}

/* ── Simple bar chart ── */
function BarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{
            width: "100%", height: max ? (d.value / max) * 64 : 0,
            background: d.color ?? "var(--luna-blue)",
            borderRadius: 4, opacity: .85,
            minHeight: 4,
            transition: "height .3s ease",
          }} />
          <span style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Recent booking row ── */
function BookingRow({ name, service, time, status }: {
  name: string; service: string; time: string; status: string;
}) {
  return (
    <tr>
      <td>
        <div className="luna-row luna-gap-2">
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "linear-gradient(135deg,#3b82f6,#6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>{name.charAt(0)}</div>
          <span style={{ fontWeight: 600 }}>{name}</span>
        </div>
      </td>
      <td style={{ color: "var(--muted)" }}>{service}</td>
      <td style={{ color: "var(--muted)", fontSize: 12 }}>{time}</td>
      <td><StatusBadge status={status} /></td>
      <td>
        <Link href="/dashboard/bookings" className="luna-btn luna-btn-sm luna-btn-secondary">View</Link>
      </td>
    </tr>
  );
}

/* ── Quick action card ── */
function QuickAction({ icon, label, color, onClick }: {
  icon: React.ReactNode; label: string; color: string; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 8, padding: "14px 10px",
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, cursor: "pointer",
      transition: "all .15s ease", fontSize: 12, fontWeight: 600,
      color: "var(--foreground)",
      width: "100%",
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = color;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${color}22`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: color + "18",
        display: "flex", alignItems: "center", justifyContent: "center", color }}>
        {icon}
      </div>
      {label}
    </button>
  );
}

type DashboardOverviewProps = {
  salonName: string;
  kpis: {
    revenue: number;
    bookings: number;
    activeStaff: string;
    cashBalance: number;
  };
  staffOnDuty: {
    name: string;
    role: string;
    clients: number;
    revenue: string;
    status: "on" | "off";
  }[];
  recentBookings: {
    name: string;
    service: string;
    time: string;
    status: string;
  }[];
  resourceStatus: {
    name: string;
    type: string;
    status: "free" | "busy" | "cleaning" | "maintenance";
    staff: string;
  }[];
};

export function DashboardOverview(props: DashboardOverviewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"today" | "week" | "month">("today");

  const revenueData = [
    { label: "Mon", value: 2400 },
    { label: "Tue", value: 3100 },
    { label: "Wed", value: 2800 },
    { label: "Thu", value: 3900 },
    { label: "Fri", value: 4200 },
    { label: "Sat", value: 5100 },
    { label: "Sun", value: 1800 },
  ];

  return (
    <div className="luna-stack" style={{ gap: 20 }}>

      {/* ── Page header ── */}
      <div className="luna-between">
        <div>
          <h1 className="luna-h1">Overview</h1>
          <p className="luna-text-muted" style={{ marginTop: 4, fontSize: 13 }}>
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {" · "}{props.salonName}
          </p>
        </div>
        <div className="luna-row luna-gap-2">
          {(["today", "week", "month"] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`luna-btn luna-btn-sm ${activeTab === t ? "luna-btn-primary" : "luna-btn-secondary"}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          <button className="luna-btn luna-btn-sm luna-btn-outline" style={{ gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="luna-grid-kpi">
        <KpiCard
          label="Total Revenue"
          value={`MAD ${props.kpis.revenue.toLocaleString()}`}
          sub="Today's sales"
          trend="up"
          sparkline={[30, 42, 38, 55, 48, 62, 58]}
          color="#3b82f6"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
        />
        <KpiCard
          label="Today's Bookings"
          value={props.kpis.bookings.toString()}
          sub="Confirmed appointments"
          trend="up"
          sparkline={[12, 18, 14, 22, 19, 24, 20]}
          color="#6366f1"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
        />
        <KpiCard
          label="Active Staff"
          value={props.kpis.activeStaff}
          sub="Currently on duty"
          trend="neutral"
          sparkline={[8, 9, 7, 10, 8, 8, 8]}
          color="#22c55e"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/></svg>}
        />
        <KpiCard
          label="Cash Balance"
          value={`MAD ${props.kpis.cashBalance.toLocaleString()}`}
          sub="In active sessions"
          trend="neutral"
          sparkline={[200, 195, 210, 185, 170, 160, 128]}
          color="#f59e0b"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
        />
      </div>

      {/* ── Charts + Quick Actions ── */}
      <div className="luna-grid-responsive-sidebar">
        {/* Bar chart */}
        <div className="luna-card luna-card-p">
          <div className="luna-between" style={{ marginBottom: 20 }}>
            <div>
              <h2 className="luna-h3">Weekly Revenue</h2>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>MAD · This week</p>
            </div>
            <span className="luna-badge luna-badge-success">+18% ↑</span>
          </div>
          <BarChart data={revenueData.map(d => ({ ...d, color: "var(--luna-blue)" }))} />
          {/* X-axis total */}
          <div className="luna-between" style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
            <p style={{ fontSize: 12, color: "var(--muted)" }}>Weekly total</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--foreground)" }}>
              MAD {revenueData.reduce((s, d) => s + d.value, 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="luna-card luna-card-p">
          <h2 className="luna-h3" style={{ marginBottom: 14 }}>Quick Actions</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <QuickAction
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
              label="New Booking"
              color="#3b82f6"
              onClick={() => router.push("/dashboard/bookings")}
            />
            <QuickAction
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>}
              label="Open POS"
              color="#6366f1"
              onClick={() => router.push("/dashboard/pos")}
            />
            <QuickAction
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20v-1a8 8 0 0116 0v1"/></svg>}
              label="Add Client"
              color="#22c55e"
              onClick={() => router.push("/dashboard/clients")}
            />
            <QuickAction
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
              label="Reports"
              color="#f59e0b"
              onClick={() => router.push("/dashboard/reports")}
            />
            <QuickAction
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>}
              label="Inventory"
              color="#ef4444"
              onClick={() => router.push("/dashboard/resources")}
            />
            <QuickAction
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>}
              label="Close Shift"
              color="#64748b"
              onClick={() => router.push("/dashboard/pos")}
            />
          </div>
        </div>
      </div>

      {/* ── Resource Status ── */}
      <div className="luna-card luna-card-p">
        <div className="luna-between" style={{ marginBottom: 16 }}>
          <h2 className="luna-h3">Resource Status</h2>
          <Link href="/dashboard/resources" className="luna-btn luna-btn-sm luna-btn-secondary">Manage</Link>
        </div>
        {props.resourceStatus.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--muted)", padding: "20px 0" }}>No resources defined yet. Add them in settings.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
            {props.resourceStatus.map(r => {
              const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
                free:        { bg: "#f0fdf4", color: "#16a34a", label: "Free" },
                busy:        { bg: "#eff6ff", color: "#1d4ed8", label: "In Use" },
                cleaning:    { bg: "#fefce8", color: "#b45309", label: "Cleaning" },
                maintenance: { bg: "#fef2f2", color: "#dc2626", label: "Maint." },
              };
              const s = statusStyle[r.status] || statusStyle.free;
              return (
                <div key={r.name} style={{
                  background: s.bg, border: `1px solid ${s.color}33`,
                  borderRadius: 10, padding: "12px 14px",
                }}>
                  <div className="luna-between" style={{ marginBottom: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</p>
                    <span style={{ fontSize: 10, fontWeight: 700, color: s.color, background: s.color + "18",
                      padding: "2px 7px", borderRadius: 99 }}>
                      {s.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--muted)" }}>{r.type}</p>
                  {r.staff !== "—" && (
                    <p style={{ fontSize: 11, color: "var(--foreground)", marginTop: 4, fontWeight: 500 }}>
                      👤 {r.staff}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Today's Bookings ── */}
      <div className="luna-card">
        <div className="luna-between luna-card-p" style={{ paddingBottom: 0, borderBottom: "1px solid var(--border)" }}>
          <h2 className="luna-h3">Today&apos;s Bookings</h2>
          <div className="luna-row luna-gap-2">
            <span className="luna-badge luna-badge-info">{props.recentBookings.length} total</span>
            <Link href="/dashboard/bookings" className="luna-btn luna-btn-sm luna-btn-primary">+ New Booking</Link>
          </div>
        </div>
        <div className="luna-table-wrap" style={{ border: "none", borderRadius: 0 }}>
          <table className="luna-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Service</th>
                <th>Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {props.recentBookings.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No bookings scheduled for today.</td></tr>
              ) : (
                props.recentBookings.map((b, i) => (
                  <BookingRow key={i} {...b} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Staff On Duty ── */}
      <div className="luna-card luna-card-p">
        <div className="luna-between" style={{ marginBottom: 16 }}>
          <h2 className="luna-h3">Staff On Duty</h2>
          <span className="luna-badge luna-badge-success">{props.staffOnDuty.length} Active</span>
        </div>
        {props.staffOnDuty.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--muted)", padding: "20px 0" }}>No staff currently clocked in.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {props.staffOnDuty.map(s => (
              <div key={s.name} style={{
                background: s.status === "on" ? "var(--surface)" : "var(--luna-gray-50)",
                border: `1px solid ${s.status === "on" ? "var(--border)" : "var(--border)"}`,
                borderRadius: 12, padding: "14px 16px",
                opacity: s.status === "off" ? .65 : 1,
              }}>
                <div className="luna-row luna-gap-2" style={{ marginBottom: 8 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "linear-gradient(135deg,#3b82f6,#6366f1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0,
                  }}>{s.name.charAt(0)}</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</p>
                    <p style={{ fontSize: 11, color: "var(--muted)" }}>{s.role}</p>
                  </div>
                </div>
                <div className="luna-between">
                  <div>
                    <p style={{ fontSize: 11, color: "var(--muted)" }}>Clients</p>
                    <p style={{ fontSize: 14, fontWeight: 700 }}>{s.clients}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 11, color: "var(--muted)" }}>Revenue</p>
                    <p style={{ fontSize: 13, fontWeight: 700 }}>{s.revenue}</p>
                  </div>
                  <span className={`luna-badge ${s.status === "on" ? "luna-badge-success" : "luna-badge-neutral"}`}>
                    {s.status === "on" ? "On Duty" : "Off"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
