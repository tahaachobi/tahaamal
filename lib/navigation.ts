export function getSafeInternalPath(value?: null | string) {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  return null;
}
