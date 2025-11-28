import { RegisterScreenComponent } from "@/components/auth";
import { get_auth_hash } from "@/utils/auth";
import { createMasterKey, setMasterKey } from "@/utils/encryption";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";

export default function RegisterScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleRegister = async () => {
    try {
      const auth_hash = get_auth_hash(email, password);

      // Encrypt master key
      const master_key = createMasterKey(email, password);
      const vault_key = "idk"; // CryptoJS.AES.encrypt(master_key, auth_hash).toString();
      const vault_key_iv = "idk2"; // CryptoJS.lib.WordArray.random(16).toString();
      // Save master key
      setMasterKey(master_key);

      const response = await fetch(
        "https://leakchecker.mwalas.pl/api/v1/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            auth_hash,
            protected_vault_key: vault_key,
            protected_vault_key_iv: vault_key_iv,
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        Alert.alert("Register failed", err.message || "Error");
        setErrorMessage(err.message);
        return;
      }

      // auto-login
      const data = await response.json();
      await AsyncStorage.setItem("token", data.access_token);
      router.replace("/home/vault");
    } catch (e) {
      Alert.alert("Error", String(e));
    }
  };

  return (
    <RegisterScreenComponent
      handle_register={handleRegister}
      email={email}
      set_email={setEmail}
      password={password}
      set_password={setPassword}
      error_message={errorMessage}
    />
  );
}
