"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "60vh", gap: 16, textAlign: "center",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "var(--luna-error-bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--luna-error)" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div>
        <h2 className="luna-h2">Something went wrong</h2>
        <p className="luna-text-muted" style={{ marginTop: 6, fontSize: 13 }}>
          {error.message || "An unexpected error occurred in the dashboard."}
        </p>
      </div>
      <button className="luna-btn luna-btn-primary" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
