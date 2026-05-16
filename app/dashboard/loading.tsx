export default function DashboardLoading() {
  return (
    <div className="luna-stack" style={{ gap: 20 }}>
      {/* Header skeleton */}
      <div className="luna-between">
        <div className="luna-stack" style={{ gap: 8 }}>
          <div style={{ width: 120, height: 28, background: "var(--luna-gray-200)", borderRadius: 6, animation: "luna-pulse-dot 1.5s ease infinite" }} />
          <div style={{ width: 220, height: 14, background: "var(--luna-gray-100)", borderRadius: 4 }} />
        </div>
        <div className="luna-row luna-gap-2">
          {[1,2,3].map(i => (
            <div key={i} style={{ width: 60, height: 30, background: "var(--luna-gray-200)", borderRadius: 8 }} />
          ))}
        </div>
      </div>

      {/* KPI skeletons */}
      <div className="luna-grid-kpi">
        {[1,2,3,4].map(i => (
          <div key={i} className="luna-kpi-card" style={{ opacity: 1 - i * 0.05 }}>
            <div className="luna-between" style={{ marginBottom: 14 }}>
              <div style={{ width: 80, height: 12, background: "var(--luna-gray-200)", borderRadius: 4 }} />
              <div style={{ width: 34, height: 34, background: "var(--luna-gray-100)", borderRadius: 8 }} />
            </div>
            <div style={{ width: 100, height: 26, background: "var(--luna-gray-200)", borderRadius: 6 }} />
            <div style={{ marginTop: 12, width: 120, height: 12, background: "var(--luna-gray-100)", borderRadius: 4 }} />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
        <div className="luna-card luna-card-p">
          <div style={{ width: 140, height: 18, background: "var(--luna-gray-200)", borderRadius: 6, marginBottom: 20 }} />
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
            {[60,80,50,90,70,100,40].map((h, i) => (
              <div key={i} style={{ flex: 1, height: h, background: "var(--luna-gray-100)", borderRadius: 4 }} />
            ))}
          </div>
        </div>
        <div className="luna-card luna-card-p">
          <div style={{ width: 100, height: 18, background: "var(--luna-gray-200)", borderRadius: 6, marginBottom: 14 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ height: 70, background: "var(--luna-gray-100)", borderRadius: 10 }} />
            ))}
          </div>
        </div>
      </div>

      {/* Table skeleton */}
      <div className="luna-card">
        <div className="luna-between luna-card-p" style={{ paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
          <div style={{ width: 140, height: 18, background: "var(--luna-gray-200)", borderRadius: 6 }} />
          <div style={{ width: 100, height: 30, background: "var(--luna-gray-100)", borderRadius: 8 }} />
        </div>
        <div style={{ padding: "0 24px" }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="luna-between" style={{ padding: "14px 0", borderBottom: "1px solid var(--luna-gray-100)" }}>
              <div className="luna-row luna-gap-2">
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--luna-gray-200)" }} />
                <div style={{ width: 120, height: 13, background: "var(--luna-gray-200)", borderRadius: 4 }} />
              </div>
              <div style={{ width: 80, height: 13, background: "var(--luna-gray-100)", borderRadius: 4 }} />
              <div style={{ width: 50, height: 22, background: "var(--luna-gray-100)", borderRadius: 99 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
