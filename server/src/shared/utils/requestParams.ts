export function readStringParam(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
}

export function readPositiveIntParam(
  value: string | string[] | undefined,
): number | null {
  const raw = readStringParam(value);
  if (!raw) {
    return null;
  }

  const number = Number(raw);
  if (!Number.isInteger(number) || number < 1) {
    return null;
  }

  return number;
}

export function readHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0].trim() || undefined;
  }
  return undefined;
}
