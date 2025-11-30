import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { settingsStyle } from "@/styles/settings";
import { logout } from "@/utils/auth"
import { useRouter } from "expo-router";

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <View style={settingsStyle.container}>
      <Text style={settingsStyle.title}>Settings</Text>

      <TouchableOpacity
        onPress={() => logout(router)}
        style={settingsStyle.logoutButton}
      >
        <Text style={settingsStyle.logoutButtonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}
