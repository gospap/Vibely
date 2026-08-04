import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

import { API_URL } from "../constants/api";
import { AuthContext } from "./AuthContext";

export const SocketContext = createContext(null);

// One connection for the whole app rather than one per screen. The server
// addresses a *user*, so a second socket would only duplicate every event.
export function SocketProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) {
      setSocket(null);
      return;
    }

    // Transports are left at their default (polling, then an upgrade to
    // websocket) on purpose: the polling handshake goes out over XHR and
    // carries the same session cookie every fetch already sends, which is how
    // the server knows who is connecting. Forcing websocket-only would skip
    // that handshake and the socket would come up unauthenticated.
    const connection = io(API_URL, { withCredentials: true });

    setSocket(connection);

    return () => connection.close();
  }, [user?.id]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}
