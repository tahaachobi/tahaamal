import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral"
  | "blue";

function variantClass(variant: BadgeVariant) {
  switch (variant) {
    case "success":
      return "luna-badge-success";
    case "warning":
      return "luna-badge-warning";
    case "error":
      return "luna-badge-error";
    case "info":
      return "luna-badge-info";
    case "neutral":
      return "luna-badge-neutral";
    case "blue":
      return "luna-badge-blue";
  }
}

export type BadgeProps = ComponentPropsWithoutRef<"span"> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return <span className={cn("luna-badge", variantClass(variant), className)} {...props} />;
}

