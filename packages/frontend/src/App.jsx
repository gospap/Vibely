import { NavigationContainer } from "@react-navigation/native";
import { useContext } from "react";

import AppNavigator from "@/navigation/AppNavigator";
import AuthStack from "@/navigation/AuthStack";
import { AuthProvider, AuthContext } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";

function RootNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null; // ή splash screen

  return user ? <AppNavigator /> : <AuthStack />;
}

export default function App() {
  return (
    <AuthProvider>
      {/* Inside AuthProvider: the socket only connects once there is a session
          to identify it with. */}
      <SocketProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SocketProvider>
    </AuthProvider>
  );
}
