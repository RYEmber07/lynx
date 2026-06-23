import axios, {type AxiosError, type InternalAxiosRequestConfig} from "axios";

// Extend config type to carry the retry flag
interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

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

/**
 * 401 response interceptor - automatically refreshes the access token on a
 * 401 Unauthorized response and retries the original request once.
 *
 * Flow:
 *  1. Response comes back with 401.
 *  2. If this is already a retry (`_retry` flag set), give up and redirect to /login.
 *  3. Otherwise, attempt POST /api/auth/refresh (uses the httpOnly refresh cookie).
 *  4. On success: update the Authorization header with the new token and retry.
 *  5. On failure: clear the auth header & cookie, then redirect to /login.
 *
 * Auth endpoints (/api/auth/*) should NOT be retried. A 401 from
 * /api/auth/refresh means the session is definitively dead and must hit
 * the catch block immediately to redirect.
 */
instance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/api/auth/refresh")
    ) {
      originalRequest._retry = true;

      try {
        const {data} = await instance.post<{accessToken: string}>(
          "/api/auth/refresh",
        );
        setAuthToken(data.accessToken);
        // Propagate the new token to the retried request
        originalRequest.headers["Authorization"] = `Bearer ${data.accessToken}`;
        return instance(originalRequest);
      } catch {
        // Refresh failed - clear local session and force a fresh login
        setAuthToken(null);
        if (typeof document !== "undefined") {
          document.cookie = "logged_in=; Max-Age=0; path=/";
        }
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default instance;
