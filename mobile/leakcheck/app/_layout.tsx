import React, {useState, useEffect} from "react";
import { Stack, useRouter, Slot } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    // Simulate checking login status
    const checkLogin = async () => {
      // TODO, example: await AsyncStorage.getItem("token")
      const loggedIn = false;
      setIsLoggedIn(loggedIn);
    };
    checkLogin();
  }, []);

  useEffect(() => {
    if (isLoggedIn === null) return;

    if (isLoggedIn) {  // redirect user (depending on login status)
      router.replace("/home");
    } else {
      router.replace("/")
    }
  }, [isLoggedIn])

  if (isLoggedIn === null) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Later TODO*/}
      <Slot />
    </Stack>);
}
