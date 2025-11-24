import * as Crypto from "expo-crypto";
import CryptoJS from "crypto-js";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

export async function deriveKey(masterPassword: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    masterPassword
  );
}

export async function encrypt(text: string): Promise<string> {
  const masterKey = await getMasterKey();
  if (!masterKey) throw Error("Master key not set");
  return CryptoJS.AES.encrypt(text, masterKey).toString();
}

export async function decrypt(ciphertext: string) {
  const masterKey = await getMasterKey();
  if (!masterKey) throw Error("Master key not set");
  const bytes = CryptoJS.AES.decrypt(ciphertext, masterKey);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export async function getMasterKey() {
  return Platform.OS === "web"
    ? await AsyncStorage.getItem("master_key")
    : await SecureStore.getItemAsync("master_key");
}
