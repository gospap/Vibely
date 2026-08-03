import { API_URL } from "../constants/api";

// The API authenticates with a session cookie, so every call needs
// credentials: "include" — easy to forget one, hence this wrapper.
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, { method = "GET", body, signal } = {}) {
  let res;

  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    // Almost always the phone not reaching the dev machine. Say so, instead of
    // surfacing "Network request failed".
    throw new ApiError("Δεν υπάρχει σύνδεση με τον server", 0);
  }

  // 204 and friends have no body to parse.
  const text = await res.text();
  const data = text ? safeParse(text) : null;

  if (!res.ok) {
    throw new ApiError(data?.message || `Σφάλμα ${res.status}`, res.status);
  }

  return data;
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// Drops undefined/empty values so callers can pass optional filters straight in.
export function toQuery(params = {}) {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );

  if (!entries.length) return "";

  return `?${entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&")}`;
}

export const http = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) => request(path, { ...options, method: "POST", body }),
  patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
  put: (path, body, options) => request(path, { ...options, method: "PUT", body }),
  del: (path, options) => request(path, { ...options, method: "DELETE" }),
};
