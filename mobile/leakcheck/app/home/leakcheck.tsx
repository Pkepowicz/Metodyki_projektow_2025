import CryptoJS from "crypto-js";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { homeStyles } from "@/styles/home";
import { leakStyles } from "@/styles/leakchecker";
import { getToken } from "@/utils/auth";

export default function LeakCheckScreen() {
  const [email, setEmail] = useState("");
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [emailLeaked, setEmailLeaked] = useState<boolean | null>(null);

  const [passwordToCheck, setPasswordToCheck] = useState("");
  const [submittingPasswordCheck, setSubmittingPasswordCheck] = useState(false);
  const [passwordLeaked, setPasswordLeaked] = useState<boolean | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (error || emailLeaked !== null || passwordLeaked !== null || success) {
      const timer = setTimeout(() => {
        setError(null);
        setEmailLeaked(null);
        setPasswordLeaked(null);
        setSuccess(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, emailLeaked, passwordLeaked, success]);

  async function addCredentials() {
    if (!email || !passwordToCheck) {
      setError("Email and password are required");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);

      const token = await getToken();

      const response = await fetch(
        "https://leakchecker.mwalas.pl/api/v1/vault/items",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            site: email.trim(),
            user: "",
            password: passwordToCheck,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add credentials");
      }

      setPasswordToCheck("");
      setEmail("");
      setSuccess(true);
    } catch (err: any) {
      setError(err.message ?? "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  async function checkEmailLeaks() {
    if (!email) {
      setError("Email is required");
      return;
    }

    try {
      setSubmittingEmail(true);
      setError(null);

      const token = await getToken();

      const response = await fetch(
        "https://leakchecker.mwalas.pl/api/v1/leaks/email/check",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email: email.trim() }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to check email");
      }

      const result: boolean = await response.json();
      setEmailLeaked(result);
    } catch (err: any) {
      setError(err.message ?? "Unknown error");
    } finally {
      setSubmittingEmail(false);
    }
  }

  async function checkPasswordLeaks() {
    if (!passwordToCheck) {
      setError("Password is required");
      return;
    }

    try {
      setSubmittingPasswordCheck(true);
      setError(null);

      const token = await getToken();
      const password_hash = CryptoJS.SHA1(passwordToCheck).toString();

      const response = await fetch(
        "https://leakchecker.mwalas.pl/api/v1/leaks/password/check",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ password: password_hash }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to check password");
      }

      const result: boolean = await response.json();
      setPasswordLeaked(result);
    } catch (err: any) {
      setError(err.message ?? "Unknown error");
    } finally {
      setSubmittingPasswordCheck(false);
    }
  }

  const canAddCredentials =
    email.trim().length > 0 && passwordToCheck.trim().length > 0;

  return (
    <View style={homeStyles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={homeStyles.title}>🔒 Leakchecker</Text>
        <Text style={homeStyles.subtitle}>
          Check if your password has been leaked
        </Text>

        <TouchableOpacity
          style={[homeStyles.addButton, { backgroundColor: "#a10964ff" }]}
        >
          <Text style={homeStyles.addButtonText}>Generate password</Text>
        </TouchableOpacity>

        {/* --- Check Email ---  */}
        <Text style={[leakStyles.subtitle, { marginTop: 20 }]}>
          Check if email is leaked
        </Text>
        <TextInput
          placeholder="Email"
          placeholderTextColor="#6B7280"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          style={[leakStyles.input, { marginBottom: 14 }]}
        />
        <TouchableOpacity
          style={[
            homeStyles.addButton,
            { marginBottom: 5 },
            submittingEmail && { opacity: 0.6 },
          ]}
          onPress={checkEmailLeaks}
          disabled={submittingEmail}
        >
          {submittingEmail ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={homeStyles.addButtonText}>Check</Text>
          )}
        </TouchableOpacity>
        {emailLeaked !== null && (
          <Text style={leakStyles.successText}>
            {emailLeaked ? "⚠️ Email was found in leaks!" : "✅ Email is safe"}
          </Text>
        )}

        {/* --- Check Password --- */}
        <Text style={[leakStyles.subtitle, { marginTop: 20 }]}>
          Check if password is leaked
        </Text>
        <TextInput
          placeholder="Password"
          placeholderTextColor="#6B7280"
          value={passwordToCheck}
          onChangeText={setPasswordToCheck}
          secureTextEntry
          style={[leakStyles.input, { marginBottom: 14 }]}
        />
        <TouchableOpacity
          style={[
            homeStyles.addButton,
            { marginBottom: 5 },
            submittingPasswordCheck && { opacity: 0.6 },
          ]}
          onPress={checkPasswordLeaks}
          disabled={submittingPasswordCheck}
        >
          {submittingPasswordCheck ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={homeStyles.addButtonText}>Check</Text>
          )}
        </TouchableOpacity>
        {passwordLeaked !== null && (
          <Text style={leakStyles.successText}>
            {passwordLeaked
              ? "⚠️ Password was found in leaks!"
              : "✅ Password is safe"}
          </Text>
        )}

        <Text style={[homeStyles.subtitle, { marginTop: 20, marginBottom: 6 }]}>
          Save credentials securely in your Vault
        </Text>

        <TouchableOpacity
          style={[
            homeStyles.addButton,
            { backgroundColor: "#a10964ff" },
            (!canAddCredentials || submitting) && { opacity: 0.6 },
          ]}
          onPress={addCredentials}
          disabled={!canAddCredentials || submitting}
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
