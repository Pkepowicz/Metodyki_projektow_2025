import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Button, Text, TextInput, TouchableOpacity, View } from "react-native";

import { settingsStyle } from "@/styles/settings";
import { deriveKey, getMasterKey, setMasterKey } from "@/utils/encryption";

export default function SettingsScreen() {
  const router = useRouter();
  const [masterPassword, setMasterPassword] = useState("");
  const [savedKeyExists, setSavedKeyExists] = useState(false);

  useEffect(() => {
    (async () => {
      const key = await getMasterKey();
      if (key) setSavedKeyExists(true);
    })();
  }, []);

  const handleSaveKey = async () => {
    if (!masterPassword.trim()) return;
    const master_key = (await deriveKey(masterPassword)).toString();
    setMasterKey(master_key);
    setSavedKeyExists(true);
    setMasterPassword("");
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    router.replace("/");
  };

  return (
    <View style={settingsStyle.container}>
      <Text style={settingsStyle.title}>Settings</Text>

      {savedKeyExists ? (
        <Text>Master key is set.</Text>
      ) : (
        <View style={settingsStyle.inputSection}>
          <TextInput
            value={masterPassword}
            onChangeText={setMasterPassword}
            placeholder="Master key"
            secureTextEntry
            style={settingsStyle.input}
          />
          <Button title="Save Master Key" onPress={handleSaveKey} />
        </View>
      )}

      <TouchableOpacity
        onPress={handleLogout}
        style={settingsStyle.logoutButton}
      >
        <Text style={settingsStyle.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}
