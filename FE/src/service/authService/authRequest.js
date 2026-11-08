import { backendRequest } from "~/utils/backendApi";

export function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

export async function sendAuthRequest(endpoint, options = {}) {
  return backendRequest(endpoint, {
    ...options,
    credentials: options.credentials || "omit",
  });
}
