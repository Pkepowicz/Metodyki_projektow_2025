import CryptoJS from "crypto-js";
import * as Crypto from "expo-crypto";
import "react-native-get-random-values";
import { get_key_value, set_key_value } from "./storage";

export async function deriveKey(master_password: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    master_password
  );
}

export async function encrypt(text: string): Promise<string> {
  const master_key = await getMasterKey();
  if (!master_key) throw Error("Master key not set");
  return CryptoJS.AES.encrypt(text, master_key).toString();
}

export async function decrypt(ciphertext: string) {
  const master_key = await getMasterKey();
  if (!master_key) throw Error("Master key not set");
  const bytes = CryptoJS.AES.decrypt(ciphertext, master_key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export async function getMasterKey() {
  return await get_key_value("master_key");
}

export async function setMasterKey(master_key: string) {
  return await set_key_value("master_key", master_key);
}

export function createMasterKey(email: string, password: string) {
  const salt = email.toLowerCase() + "masterkey";
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 10000,
  }).toString();
}
