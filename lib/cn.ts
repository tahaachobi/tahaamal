export function cn(
  ...parts: Array<false | null | string | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}

