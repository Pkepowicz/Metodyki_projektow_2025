import { ChangePasswordModal } from "@/components/settings";
import { homeStyles } from "@/styles/home";
import { settingsStyle } from "@/styles/settings";
import { getAuthHash, logout } from "@/utils/auth";
import {
  calculateMasterKey,
  decryptVaultPassword,
  encryptVaultPassword,
  getVaultKey,
  setVaultKey,
  stretchedMasterKey,
} from "@/utils/encryption";
import { get, post } from "@/utils/requests";
import CryptoJS from "crypto-js";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

type RetrievedVaultItem = {
  site: string;
  id: number;
  owner_id: number;
  encrypted_password: string;
};

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
    try {
      // Old
      const old_master_key = calculateMasterKey(email, oldPassword);
      // const old_stretched_master_key = stretchedMasterKey(old_master_key);
      const old_auth_hash = getAuthHash(old_master_key, oldPassword);
      const old_symmetric_key = await getVaultKey();
      if (!old_symmetric_key) logout(router);

      // const response_vault_key = await get("auth/vault-key");
      // if (!response_vault_key.ok) {
      //   throw Error("Invalid credentials");
      // }
      // const vault_key_data = await response_vault_key.json();
      // const old_encrypted_vault_key = vault_key_data.protected_vault_key;
      // const old_encrypted_vault_key_iv = vault_key_data.protected_vault_key_iv;

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
      const response_items = await get("vault/items");
      if (!response_items.ok) {
        throw new Error(`Error ${response_items.status} fetching vault items`);
      }
      const items: [RetrievedVaultItem] = await response_items.json();
      var new_items: RetrievedVaultItem[] = [];
      for (const item_index in items) {
        const old_item = items[item_index];

        const old_encrypted_password = old_item.encrypted_password;
        const old_password = await decryptVaultPassword(
          old_encrypted_password,
          old_symmetric_key
        );
        const new_encrypted_password: string = await encryptVaultPassword(
          old_password,
          symmetric_key.toString(CryptoJS.enc.Hex) // new symmetric key
        );
        const new_item = {
          site: old_item.site,
          id: old_item.id,
          owner_id: old_item.owner_id,
          encrypted_password: new_encrypted_password,
        };

        new_items.push(new_item);
      }

      const response = await post("auth/change-password", {
        current_auth_hash: old_auth_hash,
        new_auth_hash: auth_hash,
        new_protected_vault_key: encrypted_vault_key,
        new_protected_vault_key_iv: encrypted_vault_key_iv.toString(
          CryptoJS.enc.Hex
        ),
        items: new_items,
      });
      if (!response.ok) {
        const error = await response.json();
        throw Error(
          "Error " + response.status + " changing password: " + error.detail
        );
      }

      setVaultKey(symmetric_key.toString(CryptoJS.enc.Hex));
    } catch (error) {
      let errorMessage = "As always: skill issue";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      setErrorMessage(errorMessage);
    } finally {
      setSubmitting(false);
      setModalVisible(false);
      setErrorMessage("");
    }
  }

  return (
    <View style={settingsStyle.container}>
      <Text style={settingsStyle.title}>Settings ⚙️</Text>

      <TouchableOpacity
        style={homeStyles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={homeStyles.addButtonText}>Change password</Text>
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
