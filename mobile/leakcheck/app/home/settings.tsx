import React, { useEffect, useState } from "react";
import { View, Text, Button, TextInput, Platform, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { settingsStyle } from "@/styles/settings";
import { deriveKey, getMasterKey } from "@/utils/encryption";

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
    // maybe something wrong here TODO test
    const masterKey = (await deriveKey(masterPassword)).toString();
    if (Platform.OS === "web") {
      await AsyncStorage.setItem("master_key", masterKey);
    } else {
      // mobile
      await SecureStore.setItemAsync("master_key", masterKey.toString());
    }
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
        <Text>Master key is set. You better not forget it!</Text>
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
