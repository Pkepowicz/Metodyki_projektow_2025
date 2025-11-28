import CryptoJS from "crypto-js";

export function get_auth_hash(email: string, password: string): string {
  const salt = email.toLowerCase();
  const auth_hash = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 10000,
  }).toString();
  return auth_hash;
}
