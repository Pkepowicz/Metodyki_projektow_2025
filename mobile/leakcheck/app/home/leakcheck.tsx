import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { homeStyles } from "@/styles/home";
import { leakStyles } from "@/styles/leakchecker";

export default function LeakCheckScreen() {
  const [site, setSite] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
  if (error || success) {
    const timer = setTimeout(() => {
      setError(null);
      setSuccess(false);
    }, 4000);

    return () => clearTimeout(timer);
  }
}, [error, success]);

  async function addCredentials() {
    if (!site || !password) {
      setError("Domain and password are required");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);

      const token = await AsyncStorage.getItem("token");

      const response = await fetch(
        "https://leakchecker.mwalas.pl/api/v1/vault/items",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            site: site.trim(),
            user: "", 
            password,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add credentials");
      }

      setPassword("");
      setSite("");
      setSuccess(true);
    } catch (err: any) {
      setError(err.message ?? "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={homeStyles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={homeStyles.title}>🔒 Leakchecker</Text>
        <Text style={homeStyles.subtitle}>Check if your password has been leaked</Text>

        <TextInput
          placeholder="Website / domain"
          placeholderTextColor="#6B7280"
          value={site}
          onChangeText={setSite}
          autoCapitalize="none"
          style={leakStyles.input}
        />

        <TextInput
          placeholder="Password"
          placeholderTextColor="#6B7280"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={leakStyles.input}
        />

        <Text
          style={[homeStyles.subtitle,{ marginTop: 20, marginBottom: 6 },]}>
          Credentials will be saved securely in your Vault
        </Text>

        <TouchableOpacity
          style={[
            homeStyles.addButton,
            submitting && { opacity: 0.6 },
          ]}
          onPress={addCredentials}
          disabled={submitting}
          >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={homeStyles.addButtonText}>＋ Add credentials</Text>
          )}
        </TouchableOpacity>

          {error && <Text style={leakStyles.errorText}>{error}</Text>}
          {success && (
            <Text style={leakStyles.successText}>
              ✅ Credentials added successfully
            </Text>
          )}

      </ScrollView>
    </View>
  );
}
