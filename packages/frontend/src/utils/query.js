// Builds a query string, dropping anything unset so callers can pass optional
// filters straight in without checking each one first.
export function toQuery(params = {}) {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );

  if (!entries.length) return "";

  return `?${entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&")}`;
}
