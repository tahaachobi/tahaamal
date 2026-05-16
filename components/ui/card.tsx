import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export type CardProps = ComponentPropsWithoutRef<"div"> & {
  padded?: boolean;
};

export function Card({ className, padded = false, ...props }: CardProps) {
  return (
    <div className={cn("luna-card", padded && "luna-card-p", className)} {...props} />
  );
}

export function CardHeader({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("luna-card-header", className)} {...props} />;
}

export function CardBody({
  className,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("luna-card-body", className)} {...props} />;
}

