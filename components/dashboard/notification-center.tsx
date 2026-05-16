"use client";

import { useState, useEffect } from "react";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  createdAt: string;
  read: boolean;
};

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    // Mock notifications for demonstration - in production these would come from an API/WebSocket
    setNotifications([
      {
        id: "1",
        title: "Low Stock Alert",
        message: "Argan Shampoo 500ml is below minimum level (2 remaining).",
        type: "WARNING",
        createdAt: new Date().toISOString(),
        read: false,
      },
      {
        id: "2",
        title: "New Booking",
        message: "Ava Carter booked 'Signature Cut' for tomorrow at 10:00.",
        type: "INFO",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        read: false,
      },
      {
        id: "3",
        title: "Register Closed",
        message: "Morning cash session closed with DZD 45,000 total.",
        type: "SUCCESS",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        read: true,
      },
    ]);
  }, []);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <div style={{ position: "relative" }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="luna-btn luna-btn-icon"
        style={{ position: "relative", background: "none", border: "none", padding: 8, cursor: "pointer" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--luna-gray-600)" strokeWidth="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: 4, right: 4,
            width: 8, height: 8, borderRadius: "50%",
            background: "var(--luna-error)", border: "2px solid #fff"
          }} />
        )}
      </button>

      {isOpen && (
        <>
          <div 
            style={{ position: "fixed", inset: 0, zIndex: 40 }} 
            onClick={() => setIsOpen(false)} 
          />
          <div className="luna-card" style={{
            position: "absolute", top: "100%", right: 0, marginTop: 12,
            width: 320, maxHeight: 400, overflowY: "auto", zIndex: 50,
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
            padding: 0, border: "1px solid var(--luna-gray-200)"
          }}>
            <div className="luna-between" style={{ padding: "12px 16px", borderBottom: "1px solid var(--luna-gray-100)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>Notifications</h3>
              <button 
                onClick={markAllRead}
                style={{ fontSize: 12, color: "var(--luna-blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
              >
                Mark all read
              </button>
            </div>
            
            <div className="luna-stack" style={{ gap: 0 }}>
              {notifications.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                  No new notifications.
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} style={{
                    padding: "12px 16px", borderBottom: "1px solid var(--luna-gray-50)",
                    background: n.read ? "transparent" : "var(--luna-blue-50)",
                    display: "flex", gap: 12
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                      background: n.type === "ERROR" ? "var(--luna-error)" : 
                                 n.type === "WARNING" ? "#f59e0b" : 
                                 n.type === "SUCCESS" ? "var(--luna-success)" : "var(--luna-blue)"
                    }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{n.title}</p>
                      <p style={{ fontSize: 12, color: "var(--luna-gray-600)", lineHeight: 1.4 }}>{n.message}</p>
                      <p style={{ fontSize: 10, color: "var(--muted)", marginTop: 6 }}>
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div style={{ padding: 10, textAlign: "center", borderTop: "1px solid var(--luna-gray-100)" }}>
              <button className="luna-btn luna-btn-sm" style={{ width: "100%", background: "none", color: "var(--muted)" }}>
                View all activity
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
