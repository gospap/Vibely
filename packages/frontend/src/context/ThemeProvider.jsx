import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

import { API_URL } from "@/constants/api";
import { PALETTES, ThemeContext } from "@/styles/theme";
import { AuthContext } from "./AuthContext";

/**
 * Which palette the app is painted in.
 *
 * The choice lives on the account rather than the device, so it follows the
 * user to their tablet — `userpreferences.theme` already accepted "light" and
 * "dark" long before anything could set it. Until that has loaded, the phone's
 * own setting is used, which avoids a flash of the wrong theme on launch.
 */
export function ThemeProvider({ children }) {
  const { user } = useContext(AuthContext);
  const device = useColorScheme();

  const [scheme, setSchemeState] = useState(null);

  useEffect(() => {
    if (!user) {
      setSchemeState(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API_URL}/users/me/preferences`, {
          credentials: "include",
        });
        if (!res.ok) return;

        const prefs = await res.json();
        if (!cancelled && PALETTES[prefs?.theme]) setSchemeState(prefs.theme);
      } catch {
        // Falls back to the device setting, which is a reasonable guess.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Applied immediately and saved in the background: a theme switch that waits
  // on a round trip feels broken, and the value is already on screen either way.
  const setScheme = useCallback((next) => {
    if (!PALETTES[next]) return;
    setSchemeState(next);

    fetch(`${API_URL}/users/me/preferences`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: next }),
    }).catch(() => {});
  }, []);

  const active = scheme ?? (device === "light" ? "light" : "dark");

  const value = useMemo(
    () => ({ theme: PALETTES[active], scheme: active, setScheme }),
    [active, setScheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
