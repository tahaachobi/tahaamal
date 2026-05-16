import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type FieldProps = ComponentPropsWithoutRef<"div"> & {
  error?: ReactNode;
  hint?: ReactNode;
  label?: ReactNode;
};

export function Field({ className, error, hint, label, ...props }: FieldProps) {
  return (
    <div className={cn("luna-field", className)} {...props}>
      {label ? <div className="luna-label">{label}</div> : null}
      {props.children}
      {error ? (
        <div style={{ fontSize: 12, color: "var(--luna-error)" }}>{error}</div>
      ) : hint ? (
        <div style={{ fontSize: 12, color: "var(--muted)" }}>{hint}</div>
      ) : null}
    </div>
  );
}

