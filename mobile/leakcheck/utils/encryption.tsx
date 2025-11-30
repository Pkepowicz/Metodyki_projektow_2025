import CryptoJS from "crypto-js";
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { get_key_value, set_key_value } from "./storage";


export async function encryptVaultPassword(password: string): Promise<string> {
  const master_key = await getVaultKey();
  if (!master_key) throw Error("Master key not set");
  return CryptoJS.AES.encrypt(password, master_key).toString();
}

export async function decryptVaultPassword(encrypted_password: string): Promise<string> {
  const master_key = await getVaultKey();
  if (!master_key) throw Error("Master key not set");
  const bytes = CryptoJS.AES.decrypt(encrypted_password, master_key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export async function getVaultKey(): Promise<string|null> {
  return await get_key_value("vault_key");
}

export async function setVaultKey(vault_key: string): Promise<void> {
  return await set_key_value("vault_key", vault_key);
}

export function calculateMasterKey(email: string, password: string): string {
  const salt = email.toLowerCase();
  
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32, // 32 bits is a word btw
    iterations: 10000,
  }).toString();
}

export function stretchedMasterKey(master_key: string): string{
  const key_int_array = Uint8Array.from(master_key);
  const stretched_array = hkdf(sha256, key_int_array, undefined, undefined, 64);  // 64 bytes = 512 bits
  return stretched_array.toString();
}
