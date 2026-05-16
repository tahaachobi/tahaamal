import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg" | "xl" | "icon";

function variantClass(variant: ButtonVariant) {
  switch (variant) {
    case "primary":
      return "luna-btn-primary";
    case "secondary":
      return "luna-btn-secondary";
    case "outline":
      return "luna-btn-outline";
    case "danger":
      return "luna-btn-danger";
    case "success":
      return "luna-btn-success";
  }
}

function sizeClass(size: ButtonSize) {
  switch (size) {
    case "sm":
      return "luna-btn-sm";
    case "md":
      return "";
    case "lg":
      return "luna-btn-lg";
    case "xl":
      return "luna-btn-xl";
    case "icon":
      return "luna-btn-icon";
  }
}

export type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  icon?: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export function Button({
  className,
  icon,
  size = "md",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn("luna-btn", variantClass(variant), sizeClass(size), className)}
      {...props}
    >
      {icon}
      {props.children}
    </button>
  );
}

export type ButtonLinkProps = ComponentPropsWithoutRef<typeof Link> & {
  icon?: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export function ButtonLink({
  className,
  icon,
  size = "md",
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn("luna-btn", variantClass(variant), sizeClass(size), className)}
      {...props}
    >
      {icon}
      {props.children}
    </Link>
  );
}

