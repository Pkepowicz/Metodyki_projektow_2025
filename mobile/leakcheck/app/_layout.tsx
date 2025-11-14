import React, {useState, useEffect} from "react";
import { Stack, useRouter, Slot } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { globalStyles } from "@/styles/global";


export default function RootLayout() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkLogin = async () => {
      // TODO, example: await AsyncStorage.getItem("token")
      const loggedIn = false;
      setIsLoggedIn(loggedIn);
    };
    checkLogin();
  }, []);  // run once, when component mounts

  useEffect((): void => {
    if (isLoggedIn === null) return;

    // redirect user (depending on login status)
    if (isLoggedIn) {
      router.replace("/home");
    } else {
      router.replace("/")
    }
  }, [isLoggedIn])

  if (isLoggedIn === null) {
    return (
      <View style={globalStyles.loadingView}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Later TODO? */}
      <Slot />
    </Stack>);
}
