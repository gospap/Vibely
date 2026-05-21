import { NavigationContainer } from "@react-navigation/native";
import { useContext } from "react";

import AppNavigator from "@/navigation/AppNavigator";
import AuthStack from "@/navigation/AuthStack";
import { AuthProvider, AuthContext } from "@/context/AuthContext";

function RootNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null; // ή splash screen

  return user ? <AppNavigator /> : <AuthStack />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
