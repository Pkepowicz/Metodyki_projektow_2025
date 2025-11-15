import { View, Text, Button, TextInput } from "react-native";

import { loginStyles } from "@/styles/auth";
import { Dispatch, SetStateAction } from "react";


type LoginProps = {
  handle_login: () => void;
  email: string;
  set_email: Dispatch<SetStateAction<string>>;
  password: string;
  set_password: Dispatch<SetStateAction<string>>;
  error_message: string;
}

export default function LoginScreenComponent(
  {handle_login, email, set_email, password, set_password, error_message}: LoginProps) {

  return (
    <View style={loginStyles.container}>
      <Text style={loginStyles.title}>Login :)</Text>
      <TextInput
        style={loginStyles.input}
        placeholder="Email"
        value={email}
        onChangeText={set_email}
      />

      <TextInput
        style={loginStyles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={set_password}
      />

      {error_message ? <Text style={loginStyles.error}>{error_message}</Text> : null}

      <Button title="Log In" onPress={handle_login} />
    </View>
  )
}
