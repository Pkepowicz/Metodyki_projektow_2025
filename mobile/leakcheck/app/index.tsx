import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert } from "react-native";

import { LoginScreenComponent } from "@/components/auth";
import { isEmailValid, login } from "@/utils/auth";
import { getVaultKey } from "@/utils/encryption";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async () => {
    try {
      if (!isEmailValid(email)) {
        setErrorMessage("Invalid email");
        return;
      }

      const vault_key = getVaultKey();
      if (vault_key == null) {
        // TODO get endpoint
        setErrorMessage('Tough luck mate, not implemented yet.\nCreate new user :)');
      }

      // Login
      login(email, password, router, setErrorMessage)
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
