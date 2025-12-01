import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import CryptoJS from "crypto-js";
import { get_key_value, set_key_value } from "./storage";

export async function encryptVaultPassword(password: string): Promise<string> {
  const vault_key = await getVaultKey();
  if (!vault_key) throw Error("Vault key not set");
  return CryptoJS.AES.encrypt(password, vault_key).toString();
}

export async function decryptVaultPassword(
  encrypted_password: string
): Promise<string> {
  const vault_key = await getVaultKey();
  if (!vault_key) {
    throw Error("Error: Vault key not set");
  }
  const bytes = CryptoJS.AES.decrypt(encrypted_password, vault_key);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export async function getVaultKey(): Promise<string | null> {
  return await get_key_value("vault_key");
}

export async function setVaultKey(vault_key: string): Promise<void> {
  return await set_key_value("vault_key", vault_key);
}

export function calculateMasterKey(
  email: string,
  password: string
): CryptoJS.lib.WordArray {
  const salt = email.toLowerCase();

  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32, // 32 bits is a word btw
    iterations: 10000,
  });
}

export function stretchedMasterKey(
  master_key: CryptoJS.lib.WordArray
): CryptoJS.lib.WordArray {
  const mk_bytes = Uint8Array.from(
    master_key.words.flatMap((w) => [
      w >>> 24,
      (w >>> 16) & 255,
      (w >>> 8) & 255,
      w & 255,
    ])
  );
  // 64 bytes = 512 bits
  const stretched_array = hkdf(sha256, mk_bytes, undefined, undefined, 64);
  return CryptoJS.lib.WordArray.create(stretched_array);
}
