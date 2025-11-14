import React from "react";
import { View, Text, Button } from "react-native";
import { useRouter } from "expo-router";

import {loginStyles} from "@/styles/auth"

export default function LoginScreen() {
  const router = useRouter();

  // Dummy TODO
  const handleLogin = (): void => {
    router.replace("/home");
  };

  return (
    <View style={loginStyles.container}>
      <Text style={loginStyles.title}>Login Page</Text>
      <Button title="Log In" onPress={handleLogin} />
    </View>
  );
}
