"use client";

import { useState, useEffect } from "react";

export function MobileNavToggle() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const sidebar = document.querySelector(".luna-sidebar");
    if (sidebar) {
      if (isOpen) {
        sidebar.classList.add("open");
      } else {
        sidebar.classList.remove("open");
      }
    }
  }, [isOpen]);

  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="luna-btn luna-btn-secondary luna-mobile-only"
      style={{
        width: 40,
        height: 40,
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
      aria-label="Toggle Menu"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {isOpen ? (
          <path d="M18 6L6 18M6 6l12 12" />
        ) : (
          <path d="M4 6h16M4 12h16M4 18h16" />
        )}
      </svg>
    </button>
  );
}
