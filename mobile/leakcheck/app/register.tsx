import { RegisterScreenComponent } from "@/components/auth";
import { getAuthHash, isEmailValid, login } from "@/utils/auth";
import {
  calculateMasterKey,
  setVaultKey,
  stretchedMasterKey,
} from "@/utils/encryption";
import { post } from "@/utils/requests";
import CryptoJS from "crypto-js";
import * as Crypto from "expo-crypto";
import { useRouter } from "expo-router";
import { useState } from "react";

export default function RegisterScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleRegister = async () => {
    try {
      if (!email || !password) {
        setErrorMessage("Enter email and password");
        return;
      }
      if (!isEmailValid(email)) {
        setErrorMessage("Invalid email");
        return;
      }

      // Keys creation
      const master_key = calculateMasterKey(email, password);
      const stretched_master_key = stretchedMasterKey(master_key);
      const auth_hash = getAuthHash(master_key, password); // KDF function

      const symmetric_key_bytes = await Crypto.getRandomBytesAsync(32);
      const symmetric_key = CryptoJS.lib.WordArray.create(symmetric_key_bytes);
      const iv_bytes = await Crypto.getRandomBytesAsync(16);
      const encrypted_vault_key_iv = CryptoJS.lib.WordArray.create(iv_bytes);
      const encrypted_vault_key = CryptoJS.AES.encrypt(
        symmetric_key,
        stretched_master_key,
        { iv: encrypted_vault_key_iv }
      ).toString();

      setVaultKey(symmetric_key.toString(CryptoJS.enc.Hex));

      // Registration request
      const response = await post(
        "auth/register",
        {
          email,
          auth_hash,
          protected_vault_key: encrypted_vault_key,
          protected_vault_key_iv: encrypted_vault_key_iv.toString(
            CryptoJS.enc.Hex
          ),
        },
        false
      );

      if (!response.ok) {
        const err = await response.json();
        setErrorMessage(err.detail.toString());
        return;
      }

      // Auto login
      login(email, password, router, setErrorMessage);
    } catch (error) {
      let errorMessage = "Failed to register";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setErrorMessage(errorMessage);
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
