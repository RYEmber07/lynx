"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import api, { setAuthToken } from "./api";

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

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate session on mount.
  useEffect(() => {
    async function restoreSession() {
      try {
        const { data } = await api.post<{ accessToken: string; user: User }>(
          "/api/auth/refresh"
        );
        setAuthToken(data.accessToken);
        setAccessToken(data.accessToken);
        setUser(data.user);
      } catch {
        setUser(null);
        setAuthToken(null);
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
    const { data } = await api.post<{ accessToken: string; user: User }>(
      "/api/auth/login",
      { email, password }
    );
    setAuthToken(data.accessToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
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
    name?: string
  ): Promise<void> {
    const { data } = await api.post<{ accessToken: string; user: User }>(
      "/api/auth/register",
      { email, password, ...(name !== undefined && { name }) }
    );
    setAuthToken(data.accessToken);
    setAccessToken(data.accessToken);
    setUser(data.user);
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
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, accessToken, isLoading, login, register, logout }}
    >
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
