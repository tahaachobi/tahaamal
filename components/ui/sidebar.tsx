import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SidebarProps = ComponentPropsWithoutRef<"aside">;

export function Sidebar({ className, ...props }: SidebarProps) {
  return <aside className={cn("luna-sidebar", className)} {...props} />;
}

export type SidebarLogoProps = ComponentPropsWithoutRef<"div">;

export function SidebarLogo({ className, ...props }: SidebarLogoProps) {
  return <div className={cn("luna-sidebar-logo", className)} {...props} />;
}

export type SidebarNavProps = ComponentPropsWithoutRef<"nav">;

export function SidebarNav({ className, ...props }: SidebarNavProps) {
  return <nav className={cn("luna-sidebar-nav", className)} {...props} />;
}

export type SidebarFooterProps = ComponentPropsWithoutRef<"div">;

export function SidebarFooter({ className, ...props }: SidebarFooterProps) {
  return <div className={cn("luna-sidebar-footer", className)} {...props} />;
}

export type SidebarSectionLabelProps = ComponentPropsWithoutRef<"p">;

export function SidebarSectionLabel({
  className,
  ...props
}: SidebarSectionLabelProps) {
  return <p className={cn("luna-nav-section", className)} {...props} />;
}

export type SidebarItemProps = Omit<
  ComponentPropsWithoutRef<typeof Link>,
  "children"
> & {
  active?: boolean;
  icon?: ReactNode;
  label: ReactNode;
};

export function SidebarItem({
  active,
  className,
  icon,
  label,
  ...props
}: SidebarItemProps) {
  return (
    <Link
      className={cn("luna-nav-item", active && "active", className)}
      {...props}
    >
      {icon}
      {label}
    </Link>
  );
}

