import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export function TableWrap({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("luna-table-wrap", className)} {...props} />;
}

export function Table({
  className,
  ...props
}: ComponentPropsWithoutRef<"table">) {
  return <table className={cn("luna-table", className)} {...props} />;
}

