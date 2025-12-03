import { ChangePasswordModal } from "@/components/settings";
import { homeStyles } from "@/styles/home";
import { settingsStyle } from "@/styles/settings";
import { getAuthHash, logout } from "@/utils/auth";
import {
  calculateMasterKey,
  getVaultKey,
  stretchedMasterKey,
} from "@/utils/encryption";
import { get, post } from "@/utils/requests";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export default function SettingsScreen() {
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [oldPassword, setOldPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const [errorMessage, setErrorMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // password change
  async function changePassword() {
    setSubmitting(true);

    // Old
    const old_master_key = calculateMasterKey(email, oldPassword);
    const old_stretched_master_key = stretchedMasterKey(old_master_key);
    const old_auth_hash = getAuthHash(old_master_key, oldPassword);
    const old_symmetric_key = await getVaultKey();
    const response_vault_key = await get("auth/vault-key"); // TODO
    if (!response_vault_key.ok) {
      const error = await response_vault_key.json();
      throw Error("Error " + response_vault_key.status + " " + error.detail);
    }
    const data_vault_key = await response_vault_key.json();
    const old_encrypted_vault_key = data_vault_key.protected_vault_key;
    const old_encrypted_vault_key_iv = data_vault_key.protected_vault_key_iv;

    // New
    const master_key = calculateMasterKey(email, newPassword);
    const stretched_master_key = stretchedMasterKey(master_key);
    const auth_hash = getAuthHash(master_key, newPassword);
    const symmetric_key = CryptoJS.lib.WordArray.random(32);
    const encrypted_vault_key_iv = CryptoJS.lib.WordArray.random(16);
    const encrypted_vault_key = CryptoJS.AES.encrypt(
      symmetric_key,
      stretched_master_key,
      { iv: encrypted_vault_key_iv }
    ).toString();

    // Decrypt all messages and send encrypted new ones

    const response = await post("auth/change-password", {
      current_auth_hash: old_auth_hash,
      new_auth_hash: auth_hash,
      new_protected_vault_key: encrypted_vault_key,
      new_protected_vault_key_iv: encrypted_vault_key_iv,
      items: "List[VaultItem]",
    });
    if (!response.ok) {
      const error = await response.json();
      setErrorMessage("Error " + response.status + " " + error.detail);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
  }

  return (
    <View style={settingsStyle.container}>
      <Text style={settingsStyle.title}>Settings ⚙️</Text>

      <TouchableOpacity onPress={() => setModalVisible(true)}>
        <Text style={homeStyles.addButton}>Change password</Text>
      </TouchableOpacity>

      <ChangePasswordModal
        modalVisible={modalVisible}
        setModalVisible={setModalVisible}
        errorMessage={errorMessage}
        submitting={submitting}
        email={email}
        setEmail={setEmail}
        oldPassword={oldPassword}
        setOldPassword={setOldPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        changePassword={changePassword}
      ></ChangePasswordModal>

      <TouchableOpacity
        onPress={() => logout(router)}
        style={settingsStyle.logoutButton}
      >
        <Text style={settingsStyle.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}
