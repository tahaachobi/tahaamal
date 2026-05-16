"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Supplier = {
  id: string; name: string; email: string | null; phone: string | null;
  address: string | null; notes: string | null; productCount: number;
  orderCount: number; createdAt: string;
};

export function SuppliersPanel({ salonId, suppliers }: { salonId: string; suppliers: Supplier[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", notes: "" });

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAdd = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonId, ...form }),
      });
      if (res.ok) {
        setShowAdd(false);
        setForm({ name: "", email: "", phone: "", address: "", notes: "" });
        router.refresh();
      }
    } finally { setSaving(false); }
  };

  return (
    <div className="luna-stack" style={{ gap: 20 }}>
      <div className="luna-between">
        <div>
          <h1 className="luna-h1">Suppliers</h1>
          <p className="luna-text-muted" style={{ marginTop: 4, fontSize: 13 }}>Manage vendor profiles, contacts, and delivery tracking.</p>
        </div>
        <button className="luna-btn luna-btn-primary" onClick={() => setShowAdd(true)}>+ Add Supplier</button>
      </div>

      {/* KPI */}
      <div className="luna-grid-kpi">
        <div className="luna-kpi-card">
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Total Suppliers</p>
          <p style={{ fontSize: 26, fontWeight: 800 }}>{suppliers.length}</p>
        </div>
        <div className="luna-kpi-card">
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Products Supplied</p>
          <p style={{ fontSize: 26, fontWeight: 800 }}>{suppliers.reduce((s, sup) => s + sup.productCount, 0)}</p>
        </div>
        <div className="luna-kpi-card">
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Total Orders</p>
          <p style={{ fontSize: 26, fontWeight: 800 }}>{suppliers.reduce((s, sup) => s + sup.orderCount, 0)}</p>
        </div>
      </div>

      {/* Add Supplier Modal */}
      {showAdd && (
        <div className="luna-modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="luna-modal" onClick={e => e.stopPropagation()}>
            <div className="luna-modal-header">
              <h2 className="luna-h2">Add Supplier</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--muted)" }}>×</button>
            </div>
            <div className="luna-modal-body">
              <div className="luna-stack" style={{ gap: 14 }}>
                <div className="luna-field">
                  <label className="luna-label">Supplier Name *</label>
                  <input className="luna-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. BeautyPro Wholesale" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="luna-field">
                    <label className="luna-label">Email</label>
                    <input className="luna-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="contact@supplier.com" />
                  </div>
                  <div className="luna-field">
                    <label className="luna-label">Phone</label>
                    <input className="luna-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+213 XXX XXX" />
                  </div>
                </div>
                <div className="luna-field">
                  <label className="luna-label">Address</label>
                  <input className="luna-input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="123 Business Ave, City" />
                </div>
                <div className="luna-field">
                  <label className="luna-label">Notes</label>
                  <textarea className="luna-input" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Delivery schedule, payment terms..." style={{ resize: "vertical" }} />
                </div>
              </div>
            </div>
            <div className="luna-modal-footer">
              <button className="luna-btn luna-btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="luna-btn luna-btn-primary" onClick={handleAdd} disabled={saving || !form.name}>
                {saving ? "Saving…" : "Add Supplier"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="luna-card">
        <div className="luna-card-p" style={{ borderBottom: "1px solid var(--border)" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "var(--luna-gray-100)", borderRadius: 8, padding: "7px 12px", maxWidth: 400,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--luna-gray-400)" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input placeholder="Search suppliers…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, color: "var(--foreground)", flex: 1 }} />
          </div>
        </div>
        <div className="luna-table-wrap" style={{ border: "none", borderRadius: 0 }}>
          <table className="luna-table">
            <thead>
              <tr><th>Supplier</th><th>Contact</th><th>Products</th><th>Orders</th><th>Since</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--muted)" }}>No suppliers found.</td></tr>
              ) : (
                filtered.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="luna-row luna-gap-2">
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: "linear-gradient(135deg,#f59e0b,#ef4444)", display: "flex",
                          alignItems: "center", justifyContent: "center", color: "#fff",
                          fontSize: 14, fontWeight: 700, flexShrink: 0,
                        }}>{s.name.charAt(0)}</div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</p>
                          {s.address && <p style={{ fontSize: 11, color: "var(--muted)" }}>{s.address}</p>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        {s.email && <p style={{ fontSize: 12 }}>{s.email}</p>}
                        {s.phone && <p style={{ fontSize: 12, color: "var(--muted)" }}>{s.phone}</p>}
                        {!s.email && !s.phone && <span style={{ color: "var(--muted)" }}>—</span>}
                      </div>
                    </td>
                    <td><span style={{ fontWeight: 600 }}>{s.productCount}</span></td>
                    <td><span style={{ fontWeight: 600 }}>{s.orderCount}</span></td>
                    <td style={{ fontSize: 12, color: "var(--muted)" }}>
                      {new Date(s.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
