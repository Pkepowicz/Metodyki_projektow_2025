import React, { useEffect, useState } from "react";
import { View, Text, Button, TextInput, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { homeStyles } from "@/styles/home";
import {deriveKey, getMasterKey} from "@/utils/encryption"


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
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem("master_key", masterKey);
    } else { // mobile
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
    <View style={{flex: 1, justifyContent: "center", alignItems: "center", gap: 30}}>
      <Text style={homeStyles.text}>Settings</Text>

      {savedKeyExists ? (
          <Text>Master key is set. You better not forget it xdd</Text>
        ) : (
          <View>
            <TextInput
              value={masterPassword}
              onChangeText={setMasterPassword}
              placeholder="Master key"
              secureTextEntry
              style={{
                borderWidth: 1,
                padding: 10,
                marginTop: 10,
                width: "100%",
                borderRadius: 8,
              }}
            />
            <Button title="Save Master Key" onPress={handleSaveKey} />
          </View>
        )
      }


      <Button title="Log Out" onPress={handleLogout} />
    </View>
  );
}
