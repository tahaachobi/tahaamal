"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type StaffProps = {
  id: string;
  name: string;
  role: string;
  isClockedIn: boolean;
  activeSessionId: string | null;
  todayBookings: number;
  activeBookings: number;
  queue: {
    id: string;
    serviceName: string;
    time: string;
    status: string;
  }[];
};

export function StaffBoard({ salonId, staff }: { salonId: string, staff: StaffProps[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [newStaff, setNewStaff] = useState({ name: "", email: "", role: "STAFF", phone: "" });
  const [isCreating, setIsCreating] = useState(false);

  const toggleClock = async (staffId: string, isClockingIn: boolean) => {
    setLoadingId(staffId);
    try {
      const res = await fetch("/api/staff/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonId, staffId, action: isClockingIn ? "CLOCK_IN" : "CLOCK_OUT" })
      });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Failed to update clock status.");
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newStaff, salonId })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewStaff({ name: "", email: "", role: "STAFF", phone: "" });
        router.refresh();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to create staff member.");
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="luna-stack" style={{ gap: 20 }}>
      <div className="luna-between">
        <div>
          <h1 className="luna-h1">Staff & Schedule</h1>
          <p className="luna-text-muted" style={{ marginTop: 4, fontSize: 13 }}>
            Manage staff availability, clock-ins, and personal queues.
          </p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="luna-btn luna-btn-primary">+ Add Staff Member</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {staff.map(member => (
          <div key={member.id} className="luna-card" style={{ overflow: "hidden" }}>
            <div className="luna-card-p" style={{ borderBottom: "1px solid var(--border)", background: member.isClockedIn ? "var(--surface)" : "var(--luna-gray-50)" }}>
              <div className="luna-between" style={{ marginBottom: 12 }}>
                <div className="luna-row luna-gap-2">
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#3b82f6,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 600, fontSize: 15 }}>{member.name}</h3>
                    <p style={{ fontSize: 12, color: "var(--muted)" }}>{member.role.replace("_", " ")}</p>
                  </div>
                </div>
                <span className={`luna-badge ${member.isClockedIn ? "luna-badge-success" : "luna-badge-neutral"}`}>
                  {member.isClockedIn ? "ON DUTY" : "OFF DUTY"}
                </span>
              </div>
              <div className="luna-between">
                <div>
                  <p style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase" }}>Today&apos;s Clients</p>
                  <p style={{ fontSize: 16, fontWeight: 700 }}>{member.todayBookings}</p>
                </div>
                <button
                  className={`luna-btn luna-btn-sm ${member.isClockedIn ? "luna-btn-outline" : "luna-btn-primary"}`}
                  onClick={() => toggleClock(member.id, !member.isClockedIn)}
                  disabled={loadingId === member.id}
                >
                  {loadingId === member.id ? "Wait..." : member.isClockedIn ? "Clock Out" : "Clock In"}
                </button>
              </div>
            </div>
            
            <div style={{ padding: "16px 20px" }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "var(--foreground)" }}>Personal Queue</h4>
              {member.queue.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--muted)" }}>No clients assigned today.</p>
              ) : (
                <div className="luna-stack" style={{ gap: 8 }}>
                  {member.queue.map(q => (
                    <div key={q.id} className="luna-between" style={{ padding: "8px 12px", background: "var(--luna-gray-50)", borderRadius: 8 }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600 }}>{q.serviceName}</p>
                        <p style={{ fontSize: 11, color: "var(--muted)" }}>{q.time}</p>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, background: q.status === "IN_SERVICE" ? "var(--luna-blue)18" : "var(--border)", color: q.status === "IN_SERVICE" ? "var(--luna-blue)" : "var(--muted)", padding: "2px 6px", borderRadius: 4 }}>
                        {q.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div className="luna-card" style={{ width: "100%", maxWidth: 450, overflow: "hidden" }}>
            <div className="luna-card-p" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="luna-h2">Add Staff Member</h2>
            </div>
            <form onSubmit={handleCreateStaff} className="luna-card-p luna-stack" style={{ gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Full Name</label>
                <input required className="luna-input" style={{ width: "100%" }} value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Email Address</label>
                <input required type="email" className="luna-input" style={{ width: "100%" }} value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Role</label>
                  <select className="luna-input" style={{ width: "100%" }} value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})}>
                    <option value="STAFF">Staff</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="STOCK_MANAGER">Manager</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 6 }}>Phone</label>
                  <input className="luna-input" style={{ width: "100%" }} value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} />
                </div>
              </div>
              <div className="luna-row luna-gap-2" style={{ marginTop: 10 }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="luna-btn luna-btn-secondary" style={{ flex: 1 }}>Cancel</button>
                <button type="submit" disabled={isCreating} className="luna-btn luna-btn-primary" style={{ flex: 1 }}>{isCreating ? "Saving..." : "Add Member"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
