"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export type ModalSize = "md" | "lg" | "xl";

export type ModalProps = {
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  open: boolean;
  size?: ModalSize;
  title?: ReactNode;
};

export function Modal({
  children,
  footer,
  onClose,
  open,
  size = "md",
  title,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="luna-modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        aria-modal="true"
        className={cn(
          "luna-modal",
          size === "lg" && "luna-modal-lg",
          size === "xl" && "luna-modal-xl",
        )}
        role="dialog"
      >
        {title ? (
          <div className="luna-modal-header">
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{title}</div>
            </div>
            <Button
              aria-label="Close"
              onClick={onClose}
              size="icon"
              type="button"
              variant="secondary"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </Button>
          </div>
        ) : null}

        <div className="luna-modal-body">{children}</div>
        {footer ? <div className="luna-modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}

