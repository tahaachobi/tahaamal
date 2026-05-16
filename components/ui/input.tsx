import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export type InputProps = ComponentPropsWithoutRef<"input">;

export function Input({ className, ...props }: InputProps) {
  return <input className={cn("luna-input", className)} {...props} />;
}

export type SelectProps = ComponentPropsWithoutRef<"select">;

export function Select({ className, ...props }: SelectProps) {
  return <select className={cn("luna-select", className)} {...props} />;
}

