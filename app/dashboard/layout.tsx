import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@/app/generated/prisma/enums";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NotificationCenter } from "@/components/dashboard/notification-center";
import { MobileNavToggle } from "@/components/dashboard/mobile-nav-toggle";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();

  if (!session?.user) redirect("/login?callbackUrl=%2Fdashboard");
  if (!session.user.profileCompleted) redirect("/complete-profile?next=%2Fdashboard");
  if (session.user.role !== Role.SALON_OWNER) redirect("/unauthorized");

  return (
    <div className="luna-shell">
      {/* ── Sidebar ── */}
      <aside className="luna-sidebar">
        {/* Logo */}
        <div className="luna-sidebar-logo">
          <div className="flex items-center gap-2 mb-0.5">
            <div
              style={{
                width: 28, height: 28,
                background: "linear-gradient(135deg,#3b82f6,#6366f1)",
                borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"
                  fill="white" />
              </svg>
            </div>
            <div>
              <p style={{ color: "#fff", fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>Luna OS</p>
              <p style={{ color: "rgba(255,255,255,.4)", fontSize: 10 }}>Salon Operating System</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="luna-sidebar-nav">
          <p className="luna-nav-section">Main</p>

          <Link href="/dashboard" className="luna-nav-item active">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            Dashboard
          </Link>

          <Link href="/dashboard/bookings" className="luna-nav-item">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Bookings
          </Link>

          <Link href="/dashboard/pos" className="luna-nav-item">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            POS / Caisse
          </Link>

          <p className="luna-nav-section">Business</p>

          <Link href="/dashboard/staff" className="luna-nav-item">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="9" cy="7" r="4" /><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
              <circle cx="19" cy="11" r="2" /><path d="M22 20v-1a2 2 0 00-2-2h-1" />
            </svg>
            Staff
          </Link>

          <Link href="/dashboard/clients" className="luna-nav-item">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20v-1a8 8 0 0116 0v1" />
            </svg>
            Clients (CRM)
          </Link>

          <Link href="/dashboard/resources" className="luna-nav-item">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="1" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            Resources
          </Link>

          {session.user.role === Role.SALON_OWNER && (
            <>
              <p className="luna-nav-section">Finance</p>

              <Link href="/dashboard/reports" className="luna-nav-item">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                Analytics
              </Link>

              <Link href="/dashboard/inventory" className="luna-nav-item">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                </svg>
                Inventory
              </Link>

              <Link href="/dashboard/suppliers" className="luna-nav-item">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                </svg>
                Suppliers
              </Link>

              <p className="luna-nav-section">Settings</p>

              <Link href="/dashboard/promotions" className="luna-nav-item">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 12 20 22 4 22 4 12" />
                  <rect x="2" y="7" width="20" height="5" />
                  <line x1="12" y1="22" x2="12" y2="7" />
                  <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z" />
                  <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
                </svg>
                Loyalty & Promos
              </Link>

              <Link href="/dashboard/settings" className="luna-nav-item">
                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
                </svg>
                Settings
              </Link>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="luna-sidebar-footer">
          <div style={{
            background: "rgba(255,255,255,.05)",
            borderRadius: 10,
            padding: "10px 12px",
            marginBottom: 8,
          }}>
            <p style={{ color: "rgba(255,255,255,.8)", fontSize: 12, fontWeight: 600 }}>
              {session.user.name}
            </p>
            <p style={{ color: "rgba(255,255,255,.35)", fontSize: 11, marginTop: 2 }}>
              {session.user.role.replace("_", " ")}
            </p>
          </div>
          <Link href="/" className="luna-nav-item">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            Home
          </Link>
          <SignOutButton variant="nav" />
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="luna-main">
        {/* Top bar */}
        <header className="luna-topbar">
          <MobileNavToggle />
          <div className="luna-row luna-gap-2 flex-1">
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--luna-gray-100)", borderRadius: 8,
              padding: "7px 12px", flex: 1, maxWidth: 360,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--luna-gray-400)" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                placeholder="Search bookings, clients, services…"
                style={{ border: "none", background: "transparent", outline: "none",
                  fontSize: 13, color: "var(--foreground)", flex: 1 }}
              />
            </div>
          </div>

          <div className="luna-row luna-gap-3">
            <NotificationCenter />

            <div style={{
              width: 32, height: 32,
              background: "linear-gradient(135deg,#3b82f6,#6366f1)",
              borderRadius: "50%", display: "flex",
              alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 13, fontWeight: 700,
            }}>
              {session.user.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="luna-content">
          {children}
        </div>
      </main>
    </div>
  );
}
