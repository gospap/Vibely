import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "@/pages/LoginScreen";
import SignUpScreen from "@/pages/SignUpScreen";

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  );
}
