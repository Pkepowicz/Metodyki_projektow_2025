import React, { useState } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import LoginScreenComponent from "@/components/auth";


export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      // replace by hashing TODO
      const auth_hash = password;
      console.log('changed');
      console.log(auth_hash);

      const response = await fetch("http://localhost:8000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          auth_hash,
        }),
      })
      console.log('response');
      if (!response.ok) {
        const error = await response.json();
        Alert.alert("Login failed", error.message || "Invalid credentials");
        return;
      }
      console.log('response ok');

      const data = await response.json();
      const token = data.access_token;
      await AsyncStorage.setItem("token", token);
      console.log('token ok');

      router.replace("/home");
    } catch (error) {
      Alert.alert("Error occured", "Unable to log in. Skill issue from the programmers :(")
    }
  };

  return (
    <LoginScreenComponent handle_login={handleLogin} email={email} set_email={setEmail} password={password} set_password={setPassword}/>
  );
}
