import React, { useState, useContext } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react-native";

import styles from "./LoginScreen.styles";
import { AuthContext } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import TriangleLoader from "@/components/TriangleLoader";
import { T } from "@/styles/theme";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(null);

  const { login } = useContext(AuthContext);

  const canSubmit = email.trim() && password && !loading;

  const handleLogin = async () => {
    if (!canSubmit) return;

    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);

    if (!result.success) {
      Alert.alert("Σφάλμα σύνδεσης", result.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.glowTop} />
      <View style={styles.glowSide} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Logo size={104} />
            <Text style={styles.title}>Καλώς ήρθες πίσω</Text>
            <Text style={styles.subtitle}>
              Συνδέσου για να δεις τι παίζει απόψε
            </Text>
          </View>

          <View style={styles.form}>
            <View
              style={[styles.field, focused === "email" && styles.fieldFocused]}
            >
              <Mail
                size={18}
                color={focused === "email" ? T.primary : T.textFaint}
                strokeWidth={2.2}
              />
              <TextInput
                placeholder="Email"
                placeholderTextColor={T.textFaint}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                style={styles.input}
              />
            </View>

            <View
              style={[
                styles.field,
                focused === "password" && styles.fieldFocused,
              ]}
            >
              <Lock
                size={18}
                color={focused === "password" ? T.primary : T.textFaint}
                strokeWidth={2.2}
              />
              <TextInput
                placeholder="Κωδικός"
                placeholderTextColor={T.textFaint}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused(null)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={styles.input}
                onSubmitEditing={handleLogin}
                returnKeyType="go"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((on) => !on)}
                hitSlop={10}
              >
                {showPassword ? (
                  <EyeOff size={18} color={T.textMuted} strokeWidth={2.2} />
                ) : (
                  <Eye size={18} color={T.textMuted} strokeWidth={2.2} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleLogin}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>Σύνδεση</Text>
              <ArrowRight size={18} color="#fff" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Ή</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Δεν έχεις λογαριασμό;</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("SignUp")}
              hitSlop={8}
            >
              <Text style={styles.footerLink}>Εγγραφή</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {loading && <TriangleLoader overlay />}
    </View>
  );
}
