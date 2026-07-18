"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import {isAxiosError} from "axios";
import api, {setAuthToken} from "./api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string, name?: string): Promise<void>;
  logout(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextType | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

// The proxy (proxy.ts) runs on the Vercel domain and gates /dashboard.
// It reads the logged_in cookie, but the backend sets that cookie on the
// Railway domain — which the Vercel server NEVER receives.
// Solution: the frontend sets its own logged_in cookie on the Vercel domain
// after every successful auth operation. The proxy can then read it.
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function setFrontendLoggedIn() {
  document.cookie = `logged_in=1; path=/; SameSite=Lax; Secure; Max-Age=${COOKIE_MAX_AGE}`;
}

function clearFrontendLoggedIn() {
  document.cookie = "logged_in=; path=/; Max-Age=0";
}

export default function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rehydrate session on mount.
  useEffect(() => {
    async function restoreSession() {
      try {
        // Always attempt the refresh call — don't gate it on document.cookie.
        // In cross-domain deployments (Vercel frontend + Railway backend),
        // the refreshToken cookie is HttpOnly + SameSite=None, which means:
        //   ✅ Sent automatically on every request (withCredentials: true)
        //   ❌ NOT readable by document.cookie (third-party cookie restriction)
        // Gating on document.cookie would always return false cross-domain,
        // so we just try the refresh and treat a 401 as "no session".
        const {data} = await api.post<{accessToken: string; user: User}>(
          "/api/auth/refresh",
        );
        setAuthToken(data.accessToken);
        setAccessToken(data.accessToken);
        setUser(data.user);
        // Set the frontend-domain cookie so the proxy can gate /dashboard.
        setFrontendLoggedIn();
      } catch (err) {
        setUser(null);
        setAuthToken(null);
        clearFrontendLoggedIn();
        if (isAxiosError(err)) {
          if (err.response?.status === 429) {
            setError(
              "You have been rate limited. Please wait a few minutes before trying again.",
            );
          } else if (
            err.response?.status === 401 ||
            err.response?.status === 403
          ) {
            // No active session — this is the normal "logged out" state.
            // Nothing to do, user stays on the public page.
          } else {
            // 5xx Server Error or other API failures
            setError(
              "An unexpected server error occurred. Please try again later.",
            );
          }
        } else {
          // Complete network failure (e.g. no internet connection)
          setError("Network error. Please check your internet connection.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    restoreSession();
  }, []);


  /**
   * Authenticates an existing user.
   * Throws on invalid credentials, let the UI handle the error.
   *
   * @param email    - User's email address.
   * @param password - User's plaintext password.
   */
  async function login(email: string, password: string): Promise<void> {
    const {data} = await api.post<{accessToken: string; user: User}>(
      "/api/auth/login",
      {email, password},
    );
    setAuthToken(data.accessToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
    // Set the frontend-domain cookie so the proxy can gate /dashboard.
    setFrontendLoggedIn();
  }

  /**
   * Creates a new user account and immediately signs them in.
   * Throws on validation errors or duplicate email, let the UI handle the error.
   *
   * @param email    - New user's email address.
   * @param password - New user's plaintext password.
   * @param name     - Optional display name.
   */
  async function register(
    email: string,
    password: string,
    name?: string,
  ): Promise<void> {
    const {data} = await api.post<{accessToken: string; user: User}>(
      "/api/auth/register",
      {email, password, ...(name !== undefined && {name})},
    );
    setAuthToken(data.accessToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
    // Set the frontend-domain cookie so the proxy can gate /dashboard.
    setFrontendLoggedIn();
  }

  /**
   * Signs the user out. Calls the logout endpoint to invalidate the refresh
   * token server-side and clear the httpOnly cookie. Best-effort — local
   * state is always cleared regardless of network errors.
   */
  async function logout(): Promise<void> {
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Swallow errors, local cleanup always happens.
    } finally {
      setAuthToken(null);
      setUser(null);
      setAccessToken(null);
      clearFrontendLoggedIn();
      window.location.href = "/";
    }
  }

  return (
    <AuthContext.Provider
      value={{user, accessToken, isLoading, error, login, register, logout}}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the auth context. Must be used inside an <AuthProvider> tree.
 *
 * @throws {Error} If called outside of AuthProvider.
 */
export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
