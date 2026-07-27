function readPositiveNumber(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback;
}

export const env = Object.freeze({
  apiBaseUrl:
    import.meta.env.VITE_API_BASE_URL?.trim() ||
    "http://127.0.0.1:4000/api/v1",
  apiTimeoutMs: readPositiveNumber(
    import.meta.env.VITE_API_TIMEOUT_MS,
    10_000,
  ),
});
