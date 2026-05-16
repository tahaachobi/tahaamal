"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export function SignOutButton({
  callbackUrl = "/login",
  variant = "default",
}: {
  callbackUrl?: string;
  variant?: "default" | "nav";
}) {
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);
    await signOut({ callbackUrl });
  }

  if (variant === "nav") {
    return (
      <button
        className="luna-nav-item"
        disabled={isPending}
        onClick={handleSignOut}
        type="button"
        style={{ color: "rgba(255,255,255,.45)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        {isPending ? "Signing out…" : "Sign Out"}
      </button>
    );
  }

  return (
    <button
      className="meta-outline-button rounded-full px-4 py-2 text-sm font-medium text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isPending}
      onClick={handleSignOut}
      type="button"
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
}
