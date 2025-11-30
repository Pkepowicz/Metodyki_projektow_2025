import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { LoginScreenComponent } from "@/components/auth";
import { isEmailValid, login } from "@/utils/auth";
import { getVaultKey } from "@/utils/encryption";

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      if (!isEmailValid(email)) {
        setErrorMessage("Invalid email");
        setIsLoading(false);
        return;
      }

      const vault_key = await getVaultKey()
      console.log(vault_key)
      if (vault_key == null) {
        // TODO get endpoint
        setErrorMessage("Tough luck mate, can't restore the vault key, because it's not implemented yet.\nCreate new user :)");
        setIsLoading(false);
        return;
      }

      // Login
      await login(email, password, router, setErrorMessage)
    } catch (error) {
      setErrorMessage("Unable to log in. Programmers skill issue :(\n" + error)
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    {/* TODO ActivityIndicator not working on mobile?? */}
    {isLoading
      ? <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#4151ddff" />
        </View>
      : <LoginScreenComponent
      handle_login={handleLogin}
      email={email}
      set_email={setEmail}
      password={password}
      set_password={setPassword}
      error_message={errorMessage}
      />
    }
    </>
  );
}
