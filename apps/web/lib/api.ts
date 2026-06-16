import axios from "axios";

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Injects or removes the Authorization Bearer token on the shared axios instance.
 *
 * Call this after a successful login or token refresh to attach the access token
 * to all subsequent requests, or pass `null` on logout to remove it.
 *
 * @param token - The JWT access token string, or `null` to clear the header.
 */
export function setAuthToken(token: string | null): void {
  if (token) {
    instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete instance.defaults.headers.common["Authorization"];
  }
}

export default instance;
