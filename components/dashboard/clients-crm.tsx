"use client";
import { useState } from "react";

type Client = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  loyaltyPoints: number;
  trustStars: number;
  totalBookings: number;
  completedBookings: number;
  totalSpent: number;
  lastVisit: string | null;
};

type Supplier = {
  id: string;
  name: string;
  email: string;
  phone: string;
  category: string;
  createdAt: string;
};

export function ClientsCRM({ clients, suppliers }: { salonId: string; clients: Client[]; suppliers: Supplier[] }) {
  const [activeTab, setActiveTab] = useState<"clients" | "suppliers">("clients");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"spent" | "bookings" | "loyalty" | "name">("spent");

  const filteredClients = clients
    .filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search))
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "spent": return b.totalSpent - a.totalSpent;
        case "bookings": return b.totalBookings - a.totalBookings;
        case "loyalty": return b.loyaltyPoints - a.loyaltyPoints;
        case "name": return a.name.localeCompare(b.name);
        default: return 0;
      }
    });

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.phone.includes(search)
  );

  const totalRevenue = clients.reduce((s, c) => s + c.totalSpent, 0);
  const totalPoints = clients.reduce((s, c) => s + c.loyaltyPoints, 0);

  return (
    <div className="luna-stack" style={{ gap: 20 }}>
      {/* Header */}
      <div className="luna-between">
        <div>
          <h1 className="luna-h1">CRM & Directory</h1>
          <p className="luna-text-muted" style={{ marginTop: 4, fontSize: 13 }}>
            Manage your client relationships and business suppliers.
          </p>
        </div>
        <div className="luna-row luna-gap-2">
          <button 
            className={`luna-btn ${activeTab === "clients" ? "luna-btn-primary" : "luna-btn-secondary"}`}
            onClick={() => setActiveTab("clients")}
          >
            Clients
          </button>
          <button 
            className={`luna-btn ${activeTab === "suppliers" ? "luna-btn-primary" : "luna-btn-secondary"}`}
            onClick={() => setActiveTab("suppliers")}
          >
            Fournisseurs
          </button>
        </div>
      </div>

      {activeTab === "clients" && (
        <>
          {/* KPI Summary */}
          <div className="luna-grid-kpi">
            <div className="luna-kpi-card">
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Total Clients</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)" }}>{clients.length}</p>
              <p style={{ fontSize: 12, color: "var(--luna-success)", fontWeight: 600, marginTop: 8 }}>Active base</p>
            </div>
            <div className="luna-kpi-card">
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Total Revenue</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)" }}>MAD {totalRevenue.toLocaleString()}</p>
              <p style={{ fontSize: 12, color: "var(--luna-blue)", fontWeight: 600, marginTop: 8 }}>From bookings</p>
            </div>
            <div className="luna-kpi-card">
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Loyalty Points</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)" }}>{totalPoints.toLocaleString()}</p>
              <p style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600, marginTop: 8 }}>In circulation</p>
            </div>
            <div className="luna-kpi-card">
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Avg. Spend</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: "var(--foreground)" }}>
                MAD {clients.length > 0 ? Math.round(totalRevenue / clients.length).toLocaleString() : "0"}
              </p>
              <p style={{ fontSize: 12, color: "#6366f1", fontWeight: 600, marginTop: 8 }}>Per client</p>
            </div>
          </div>

          <div className="luna-card luna-card-p">
            <div className="luna-between" style={{ marginBottom: 16 }}>
              <div className="luna-row luna-gap-2" style={{ flex: 1, maxWidth: 400, background: "var(--luna-gray-100)", borderRadius: 8, padding: "7px 12px" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--luna-gray-400)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                <input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "var(--foreground)", flex: 1 }} />
              </div>
              <div className="luna-row luna-gap-2">
                {(["spent", "bookings", "loyalty", "name"] as const).map(s => (
                  <button key={s} onClick={() => setSortBy(s)} className={`luna-btn luna-btn-sm ${sortBy === s ? "luna-btn-primary" : "luna-btn-secondary"}`}>
                    {s === "spent" ? "Top Spenders" : s === "bookings" ? "Most Active" : s === "loyalty" ? "Loyalty" : "A–Z"}
                  </button>
                ))}
              </div>
            </div>

            <div className="luna-table-wrap" style={{ border: "none" }}>
              <table className="luna-table">
                <thead>
                  <tr><th>Client</th><th>Contact</th><th>Trust</th><th>Loyalty</th><th>Bookings</th><th>Total Spent</th><th>Last Visit</th></tr>
                </thead>
                <tbody>
                  {filteredClients.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No clients found.</td></tr>
                  ) : (
                    filteredClients.map(c => (
                      <tr key={c.id}>
                        <td>
                          <div className="luna-row luna-gap-2">
                            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700 }}>{c.name.charAt(0)}</div>
                            <div><p style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</p><p style={{ fontSize: 11, color: "var(--muted)" }}>{c.email}</p></div>
                          </div>
                        </td>
                        <td style={{ color: "var(--muted)", fontSize: 13 }}>{c.phone || "—"}</td>
                        <td><div style={{ display: "flex", gap: 2 }}>{[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: 12, color: s <= c.trustStars ? "#f59e0b" : "var(--luna-gray-300)" }}>★</span>)}</div></td>
                        <td><span style={{ background: c.loyaltyPoints > 0 ? "#f59e0b18" : "var(--luna-gray-100)", color: c.loyaltyPoints > 0 ? "#b45309" : "var(--muted)", padding: "3px 8px", borderRadius: 99, fontSize: 12, fontWeight: 600 }}>{c.loyaltyPoints} pts</span></td>
                        <td><span style={{ fontWeight: 600 }}>{c.totalBookings}</span> <span style={{ fontSize: 11, color: "var(--muted)" }}>({c.completedBookings})</span></td>
                        <td style={{ fontWeight: 600 }}>MAD {c.totalSpent.toLocaleString()}</td>
                        <td style={{ fontSize: 12, color: "var(--muted)" }}>{c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === "suppliers" && (
        <div className="luna-card luna-card-p">
          <div className="luna-between" style={{ marginBottom: 16 }}>
            <div className="luna-row luna-gap-2" style={{ flex: 1, maxWidth: 400, background: "var(--luna-gray-100)", borderRadius: 8, padding: "7px 12px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--luna-gray-400)" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
              <input placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "var(--foreground)", flex: 1 }} />
            </div>
            <button className="luna-btn luna-btn-primary">+ Add Fournisseur</button>
          </div>

          <div className="luna-table-wrap" style={{ border: "none" }}>
            <table className="luna-table">
              <thead>
                <tr><th>Fournisseur</th><th>Category</th><th>Contact</th><th>Email</th><th>Added On</th></tr>
              </thead>
              <tbody>
                {filteredSuppliers.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No suppliers found.</td></tr>
                ) : (
                  filteredSuppliers.map(s => (
                    <tr key={s.id}>
                      <td><span style={{ fontWeight: 600 }}>{s.name}</span></td>
                      <td><span className="luna-badge luna-badge-info">{s.category}</span></td>
                      <td style={{ color: "var(--muted)" }}>{s.phone}</td>
                      <td style={{ color: "var(--muted)" }}>{s.email}</td>
                      <td style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
