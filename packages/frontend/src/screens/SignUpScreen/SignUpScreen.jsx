import React, { useState, useContext } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import styles from "../LoginScreen/LoginScreen.styles";
import { AuthContext } from "../../context/AuthContext";
import { Logo } from "../../components/Logo";
import TriangleLoader from "../../components/TriangleLoader";

export default function SignUpScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useContext(AuthContext);

  const handleSignUp = async () => {
    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);

    if (!result.success) {
      Alert.alert("Σφάλμα εγγραφής", result.message);
      return;
    }
  };

  return (
    <View style={styles.container}>
      <Logo size={120} style={{ marginBottom: 20 }} />
      <Text style={styles.title}>Δημιουργία λογαριασμού</Text>
      <Text style={styles.subtitle}>
        Έλα στο Vibely και ανακάλυψε νέες εμπειρίες
      </Text>

      <TextInput
        placeholder="Όνομα"
        placeholderTextColor="#9CA3AF"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        style={styles.input}
      />

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
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text style={styles.buttonText}>Εγγραφή</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkContainer}
        onPress={() => navigation.navigate("Login")}
      >
        <Text style={styles.link}>Έχεις ήδη λογαριασμό; Σύνδεση</Text>
      </TouchableOpacity>

      {loading && <TriangleLoader overlay />}
    </View>
  );
}
