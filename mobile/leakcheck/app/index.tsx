import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert } from "react-native";

import { LoginScreenComponent } from "@/components/auth";
import { get_auth_hash } from "@/utils/auth";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async () => {
    try {
      const auth_hash = get_auth_hash(email, password);

      const response = await fetch(
        "https://leakchecker.mwalas.pl/api/v1/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            auth_hash,
          }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        setErrorMessage(error.message || "Invalid credentials");
        Alert.alert("Login failed", error.message || "Invalid credentials");
        return;
      }

      const data = await response.json();
      const token = data.access_token;
      await AsyncStorage.setItem("token", token);

      router.replace("/home/vault");
    } catch (error) {
      Alert.alert(
        "Error occured",
        "Unable to log in. Programmers skill issue :(\n" + error
      );
    }
  };

  return (
    <LoginScreenComponent
      handle_login={handleLogin}
      email={email}
      set_email={setEmail}
      password={password}
      set_password={setPassword}
      error_message={errorMessage}
    />
  );
}
