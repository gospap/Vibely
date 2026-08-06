import { NavigationContainer } from "@react-navigation/native";
import { useContext } from "react";

import AppNavigator from "@/navigation/AppNavigator";
import AuthStack from "@/navigation/AuthStack";
import { navigationRef } from "@/navigation/rootNavigation";
import { AuthProvider, AuthContext } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { MessagesProvider } from "@/context/MessagesContext";
import { ThemeProvider } from "@/context/ThemeProvider";

function RootNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null; // ή splash screen

  return user ? <AppNavigator /> : <AuthStack />;
}

export default function App() {
  return (
    <AuthProvider>
      {/* Inside AuthProvider too: the palette is stored on the account, so it
          cannot be read until there is a session. */}
      <ThemeProvider>
      {/* Inside AuthProvider: the socket only connects once there is a session
          to identify it with. */}
      <SocketProvider>
        {/* Above the navigator, so an incoming message is handled whatever
            screen is on top — including none of them, when a notification is
            tapped from outside the app. */}
        <MessagesProvider>
          <NavigationContainer ref={navigationRef}>
            <RootNavigator />
          </NavigationContainer>
        </MessagesProvider>
      </SocketProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
