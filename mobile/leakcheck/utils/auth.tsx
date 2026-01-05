import {
  calculateMasterKey,
  setVaultKey,
  stretchedMasterKey,
} from "@/utils/encryption";
import { get_key_value, remove_key, set_key_value } from "@/utils/storage";
import CryptoJS from "crypto-js";
import { Router } from "expo-router";
import { get, post } from "./requests";

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
  // send request to /logout (not implemented yet)
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

export async function getRefreshToken(): Promise<string | null> {
  return await get_key_value('refresh_token');
}

export async function setRefreshToken(token: string): Promise<void> {
  set_key_value("refresh_token", token);
}

function parseJwt(token: string): any {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = parseJwt(token);
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch {
    return true; // if error, treat as expired
  }
}

export async function refreshTokens(): Promise<void> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new Error("Refresh token not available. Try relogging");
  }

  const response = await post("auth/refresh", { refresh_token: refreshToken }, false);
  if (!response.ok) {
    throw new Error("Failed to refresh tokens. Try relogging");
  }

  const data = await response.json();
  await setToken(data.access_token);
  await setRefreshToken(data.refresh_token);
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

    const response = await post(
      "auth/login",
      {
        email,
        auth_hash,
      },
      false
    );

    if (!response.ok) {
      const error = await response.json();
      throw Error(error.detail || "Invalid credentials");
    }

    const data = await response.json();
    const token = data.access_token;
    const refreshToken = data.refresh_token;
    await set_key_value("token", token);
    await setRefreshToken(refreshToken);

    // Get vault key
    const response_vault_key = await get("auth/vault-key");
    if (!response_vault_key.ok) {
      const error = await response_vault_key.json();
      throw Error("Error " + response_vault_key.status + " " + error.detail);
    }
    const data_vault_key = await response_vault_key.json();
    var encrypted_vault_key = data_vault_key.protected_vault_key;
    var encrypted_vault_key_iv = data_vault_key.protected_vault_key_iv;
    set_key_value("iv", encrypted_vault_key_iv);

    // Decrypt and set vault key
    const stretched_master_key = stretchedMasterKey(master_key);
    encrypted_vault_key = CryptoJS.enc.Base64.parse(encrypted_vault_key);
    encrypted_vault_key_iv = CryptoJS.enc.Hex.parse(encrypted_vault_key_iv);

    const symmetric_key = CryptoJS.AES.decrypt(
      CryptoJS.lib.CipherParams.create({
        ciphertext: encrypted_vault_key,
      }),
      stretched_master_key,
      { iv: encrypted_vault_key_iv }
    );
    setVaultKey(symmetric_key.toString(CryptoJS.enc.Hex));

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
