import { calculateMasterKey } from "@/utils/encryption";
import { get_key_value, remove_key, set_key_value } from "@/utils/storage";
import CryptoJS from "crypto-js";
import { Router } from "expo-router";

export function getAuthHash(
  master_key: CryptoJS.lib.WordArray,
  salt: string
): string {
  return CryptoJS.PBKDF2(master_key, salt, {
    keySize: 256 / 32,
    iterations: 10000,
  }).toString(CryptoJS.enc.Hex);
}

export async function logout(router: Router): Promise<void> {
  await remove_key("token");
  router.replace("/");
}

export async function getToken(): Promise<string | null> {
  return await get_key_value("token");
}

export async function setToken(token: string): Promise<void> {
  set_key_value("token", token);
}

export function isEmailValid(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Saves token and redirects to /home/vault
 * @param email
 * @param password
 * @param router
 * @param setErrorMessage is a function to show error message to user
 * @returns token or raises error "invalid credentials"
 */
export async function login(
  email: string,
  password: string,
  router: Router,
  setErrorMessage: ((message: string) => void) | null
) {
  try {
    const master_key = calculateMasterKey(email, password);
    const auth_hash = getAuthHash(master_key, password);

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
      throw Error(error.message || "Invalid credentials");
    }

    const data = await response.json();
    const token = data.access_token;
    set_key_value("token", token);

    router.replace("/home/vault");
    return token;
  } catch (error) {
    if (setErrorMessage == null) {
      if (error instanceof Error) {
        throw Error(error.message);
      } else {
        throw Error(String(error));
      }
    } else {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(String(error));
      }
    }
  }
}
