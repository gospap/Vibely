import { createContext, useEffect, useState } from "react";
import { API_URL } from "../constants/api";
import { unregisterPushToken } from "../utils/push";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function checkAuth() {
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        credentials: "include",
      });
      const data = await res.json();

      if (res.ok) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        return { success: true };
      }

      return { success: false, message: data.message || "Login failed" };
    } catch (err) {
      return { success: false, message: "Failed to connect to server" };
    }
  }

  async function register(name, email, password) {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        return { success: true };
      }

      return { success: false, message: data.message || "Registration failed" };
    } catch (err) {
      return { success: false, message: "Failed to connect to server" };
    }
  }

  async function logout() {
    try {
      // Before the session goes: the API needs the cookie to know whose device
      // this is, and a token left behind would keep notifying a phone that has
      // signed out.
      await unregisterPushToken();

      const res = await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setUser(null);
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      // refresh re-reads /auth/me, so an edit made on the profile screen shows
      // up everywhere the user object is consumed.
      value={{ user, loading, login, register, logout, refresh: checkAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}
