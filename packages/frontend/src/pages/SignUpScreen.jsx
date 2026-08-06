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
import User from "lucide-react-native/dist/esm/icons/user";
import Mail from "lucide-react-native/dist/esm/icons/mail";
import Lock from "lucide-react-native/dist/esm/icons/lock";
import Eye from "lucide-react-native/dist/esm/icons/eye";
import EyeOff from "lucide-react-native/dist/esm/icons/eye-off";
import ArrowRight from "lucide-react-native/dist/esm/icons/arrow-right";

import styles from "./LoginScreen.styles";
import { AuthContext } from "@/context/AuthContext";
import { Logo } from "@/components/Logo";
import TriangleLoader from "@/components/TriangleLoader";
import { T } from "@/styles/theme";

export default function SignUpScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(null);

  const { register } = useContext(AuthContext);

  const canSubmit = name.trim() && email.trim() && password && !loading;

  const handleSignUp = async () => {
    if (!canSubmit) return;

    setLoading(true);
    const result = await register(name.trim(), email.trim(), password);
    setLoading(false);

    if (!result.success) {
      Alert.alert("Σφάλμα εγγραφής", result.message);
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
            <Logo size={92} />
            <Text style={styles.title}>Δημιουργία λογαριασμού</Text>
            <Text style={styles.subtitle}>
              Έλα στο Vibely και ανακάλυψε νέες εμπειρίες
            </Text>
          </View>

          <View style={styles.form}>
            <View
              style={[styles.field, focused === "name" && styles.fieldFocused]}
            >
              <User
                size={18}
                color={focused === "name" ? T.primary : T.textFaint}
                strokeWidth={2.2}
              />
              <TextInput
                placeholder="Όνομα"
                placeholderTextColor={T.textFaint}
                value={name}
                onChangeText={setName}
                onFocus={() => setFocused("name")}
                onBlur={() => setFocused(null)}
                autoCapitalize="words"
                autoComplete="name"
                style={styles.input}
              />
            </View>

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
                onSubmitEditing={handleSignUp}
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
              onPress={handleSignUp}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>Εγγραφή</Text>
              <ArrowRight size={18} color="#fff" strokeWidth={2.4} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Ή</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Έχεις ήδη λογαριασμό;</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Login")}
              hitSlop={8}
            >
              <Text style={styles.footerLink}>Σύνδεση</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {loading && <TriangleLoader overlay />}
    </View>
  );
}
