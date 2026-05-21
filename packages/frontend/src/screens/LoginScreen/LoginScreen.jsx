import React, { useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import styles from "./LoginScreen.styles";
import { AuthContext } from "../../context/AuthContext";
import { Logo } from "../../components/Logo";
import TriangleLoader from "../../components/TriangleLoader";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const handleLogin = async () => {
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      Alert.alert("Σφάλμα σύνδεσης", result.message);
      return;
    }
  };

  return (
    <View style={styles.container}>
      <Logo size={120} style={{ marginBottom: 30 }} />
      <TextInput
        placeholder="Email"
        placeholderTextColor="#9CA3AF"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={styles.input}
      />

      <TextInput
        placeholder="Κωδικός"
        placeholderTextColor="#9CA3AF"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Σύνδεση</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkContainer}
        onPress={() => navigation.navigate("SignUp")}
      >
        <Text style={styles.link}>Δεν έχεις λογαριασμό; Εγγραφή</Text>
      </TouchableOpacity>

      {loading && <TriangleLoader overlay />}
    </View>
  );
}
