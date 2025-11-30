import { useRouter } from "expo-router";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

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

export function LoginScreenComponent({
  handle_login,
  email,
  set_email,
  password,
  set_password,
  error_message,
}: LoginProps) {
  const router = useRouter();
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

      <TouchableOpacity style={{ marginTop: 20 }}>
        <Text onPress={() => router.push("/register")}>
          Don't have an account? Register
        </Text>
      </TouchableOpacity>
    </View>
  );
}

type RegisterProps = {
  handle_register: () => void;
  email: string;
  set_email: Dispatch<SetStateAction<string>>;
  password: string;
  set_password: Dispatch<SetStateAction<string>>;
  error_message: string;
};

export function RegisterScreenComponent({
  handle_register,
  email,
  set_email,
  password,
  set_password,
  error_message,
}: RegisterProps) {
  const router = useRouter();
  return (
    <View style={loginStyles.container}>
      <Text style={loginStyles.title}>Leakchecker 🪪</Text>
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

      <TouchableOpacity
        style={loginStyles.loginButton}
        onPress={handle_register}
      >
        <Text style={loginStyles.loginButtonText}>Sign up</Text>
      </TouchableOpacity>

      <TouchableOpacity style={{ marginTop: 20 }}>
        <Text onPress={() => router.push("/")}>
          Already have an account? Login
        </Text>
      </TouchableOpacity>
    </View>
  );
}
