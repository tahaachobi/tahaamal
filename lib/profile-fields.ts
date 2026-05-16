export function combineProfileName(firstName: string, lastName: string) {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").trim();
}

export function splitProfileName(name: null | string | undefined) {
  const normalized = typeof name === "string" ? name.trim() : "";

  if (!normalized) {
    return {
      firstName: "",
      lastName: "",
    };
  }

  const [firstName, ...rest] = normalized.split(/\s+/);

  return {
    firstName,
    lastName: rest.join(" "),
  };
}
