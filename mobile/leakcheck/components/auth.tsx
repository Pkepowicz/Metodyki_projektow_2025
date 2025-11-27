import { View, Text, Button, TextInput, TouchableOpacity } from "react-native";

import { loginStyles } from "@/styles/auth";
import { Dispatch, SetStateAction } from "react";

type LoginProps = {
  handle_login: () => void;
  email: string;
  set_email: Dispatch<SetStateAction<string>>;
  password: string;
  set_password: Dispatch<SetStateAction<string>>;
  error_message: string;
};

export default function LoginScreenComponent({
  handle_login,
  email,
  set_email,
  password,
  set_password,
  error_message,
}: LoginProps) {
  return (
    <View style={loginStyles.container}>
      <Text style={loginStyles.title}>Leakchecker login 🪪</Text>
      <TextInput
        style={loginStyles.input}
        placeholder="Email"
        placeholderTextColor="#6B7280"
        value={email}
        onChangeText={set_email}
      />

      <TextInput
        style={loginStyles.input}
        placeholder="Password"
        placeholderTextColor="#6B7280"
        secureTextEntry
        value={password}
        onChangeText={set_password}
      />

      {error_message ? (
        <Text style={loginStyles.error}>{error_message}</Text>
      ) : null}

      <TouchableOpacity style={loginStyles.loginButton} onPress={handle_login}>
        <Text style={loginStyles.loginButtonText}>Log In</Text>
      </TouchableOpacity>
    </View>
  );
}
