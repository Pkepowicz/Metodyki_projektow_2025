import React from "react";
import { View, Text, Button } from "react-native";
import { useRouter } from "expo-router";

import { homeStyles } from "@/styles/home";

export default function SettingsScreen() {
  const router = useRouter();

  // Dummy TODO
  const handleLogout = () => {
    router.replace("/");
  };

  return (
    <View style={homeStyles.container}>
      <Text style={homeStyles.text}>Settings</Text>
      <Button title="Log Out" onPress={handleLogout} />
    </View>
  );
}
