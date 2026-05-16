"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResourceBoard({ salonId, resources }: { salonId: string, resources: { id: string; name: string; type: string; status: string }[], staff: any[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newResource, setNewResource] = useState({ name: "", type: "CHAIR" });
  const [isCreating, setIsCreating] = useState(false);

  const updateStatus = async (id: string, status: string) => {
    setLoadingId(id);
    try {
      const res = await fetch("/api/resources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) router.refresh();
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newResource, salonId })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewResource({ name: "", type: "CHAIR" });
        router.refresh();
      }
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "FREE": return { bg: "#f0fdf4", color: "#16a34a", label: "Free" };
      case "BUSY": return { bg: "#eff6ff", color: "#1d4ed8", label: "In Use" };
      case "CLEANING": return { bg: "#fefce8", color: "#b45309", label: "Cleaning" };
      case "MAINTENANCE": return { bg: "#fef2f2", color: "#dc2626", label: "Maintenance" };
      default: return { bg: "#f8fafc", color: "#64748b", label: status };
    }
  };

  return (
    <div className="luna-stack" style={{ gap: 20 }}>
      <div className="luna-between">
        <div>
          <h1 className="luna-h1">Resource Board</h1>
          <p className="luna-text-muted" style={{ marginTop: 4, fontSize: 13 }}>
            Monitor and manage chairs, rooms, beds, and stations.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="luna-btn luna-btn-primary">+ Add Resource</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
        {resources.map(res => {
          const s = getStatusColor(res.status);
          return (
            <div key={res.id} className="luna-card" style={{ padding: 16, borderLeft: `4px solid ${s.color}` }}>
              <div className="luna-between" style={{ marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontWeight: 600, fontSize: 15 }}>{res.name}</h3>
                  <p style={{ fontSize: 12, color: "var(--muted)" }}>{res.type}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: s.color, background: s.bg, padding: "4px 8px", borderRadius: 99 }}>
                  {s.label}
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <select 
                  className="luna-input" 
                  style={{ flex: 1, padding: "6px 8px", fontSize: 12 }}
                  value={res.status}
                  onChange={(e) => updateStatus(res.id, e.target.value)}
                  disabled={loadingId === res.id}
                >
                  <option value="FREE">Free</option>
                  <option value="BUSY">Busy</option>
                  <option value="CLEANING">Cleaning</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div className="luna-card" style={{ width: "100%", maxWidth: 400 }}>
            <div className="luna-card-p" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="luna-h2">New Resource</h2>
            </div>
            <form onSubmit={handleCreate} className="luna-card-p luna-stack" style={{ gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Resource Name (e.g. Chair 01)</label>
                <input required className="luna-input" style={{ width: "100%" }} value={newResource.name} onChange={e => setNewResource({...newResource, name: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Type</label>
                <select className="luna-input" style={{ width: "100%" }} value={newResource.type} onChange={e => setNewResource({...newResource, type: e.target.value})}>
                  <option value="CHAIR">Barber Chair</option>
                  <option value="ROOM">Treatment Room</option>
                  <option value="BED">Massage Bed</option>
                  <option value="STATION">Beauty Station</option>
                </select>
              </div>
              <div className="luna-row luna-gap-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="luna-btn luna-btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={isCreating} className="luna-btn luna-btn-primary" style={{ flex: 1 }}>{isCreating ? "Saving..." : "Add Resource"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
