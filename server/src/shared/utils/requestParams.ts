export function readStringParam(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
}

export function readQueryValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return readStringParam(value);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return readStringParam(value[0]);
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
