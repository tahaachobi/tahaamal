"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BookingPipeline({ bookings }: { salonId: string; bookings: { id: string, status: string, clientName: string, startTime: string, serviceName: string, staffName: string, resourceName: string }[]; staff: { id: string; name: string }[]; resources: { id: string; name: string }[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const updateStatus = async (id: string, status: string) => {
    setLoadingId(id);
    try {
      const res = await fetch("/api/bookings/pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) router.refresh();
    } finally {
      setLoadingId(null);
    }
  };

  const columns = [
    { id: "PENDING", title: "New Requests", color: "var(--luna-gray-200)" },
    { id: "ACCEPTED", title: "Accepted", color: "var(--luna-blue)" },
    { id: "CONFIRMED", title: "Confirmed", color: "var(--luna-blue)" },
    { id: "ARRIVING", title: "Arriving", color: "var(--luna-warning)" },
    { id: "IN_SERVICE", title: "In Service", color: "var(--luna-success)" },
    { id: "COMPLETED", title: "Completed", color: "var(--luna-gray-500)" },
  ];

  return (
    <div className="luna-stack" style={{ gap: 20, height: "calc(100vh - 120px)" }}>
      <div className="luna-between">
        <div>
          <h1 className="luna-h1">Booking Pipeline</h1>
          <p className="luna-text-muted" style={{ marginTop: 4, fontSize: 13 }}>
            Manage the client journey from request to completion.
          </p>
        </div>
        <button className="luna-btn luna-btn-primary">+ New Booking</button>
      </div>

      <div style={{ display: "flex", gap: 16, overflowX: "auto", height: "100%", paddingBottom: 16 }}>
        {columns.map(col => {
          const columnBookings = bookings.filter(b => b.status === col.id);
          return (
            <div key={col.id} style={{ minWidth: 320, background: "var(--luna-gray-50)", borderRadius: 12, display: "flex", flexDirection: "column", border: "1px solid var(--border)" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: col.color }} />
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>{col.title}</h3>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", background: "var(--border)", padding: "2px 8px", borderRadius: 12 }}>
                  {columnBookings.length}
                </span>
              </div>

              <div style={{ padding: 12, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
                {columnBookings.map(b => (
                  <div key={b.id} className="luna-card" style={{ padding: 16, border: "1px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                    <div className="luna-between" style={{ marginBottom: 12 }}>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{b.clientName}</p>
                      <span style={{ fontSize: 12, color: "var(--luna-blue)", fontWeight: 600 }}>{b.startTime}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--foreground)", marginBottom: 8 }}>{b.serviceName}</p>
                    <div className="luna-row luna-gap-2" style={{ marginBottom: 16 }}>
                      <span style={{ fontSize: 11, background: "var(--luna-gray-100)", padding: "4px 8px", borderRadius: 6, color: "var(--muted)" }}>👤 {b.staffName}</span>
                      <span style={{ fontSize: 11, background: "var(--luna-gray-100)", padding: "4px 8px", borderRadius: 6, color: "var(--muted)" }}>🏠 {b.resourceName}</span>
                    </div>
                    
                    <div className="luna-stack" style={{ gap: 8 }}>
                      <select 
                        className="luna-input" 
                        style={{ fontSize: 12, padding: "6px 8px" }}
                        value={b.status}
                        onChange={(e) => updateStatus(b.id, e.target.value)}
                        disabled={loadingId === b.id}
                      >
                        {columns.map(c => (
                          <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                        <option value="CANCELLED">Cancel Booking</option>
                        <option value="NO_SHOW">No Show</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
