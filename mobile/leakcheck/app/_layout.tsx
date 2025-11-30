import React, { useState, useEffect } from "react";
import { Stack, useRouter } from "expo-router";
// import { ActivityIndicator, View } from "react-native";

// import { globalStyles } from "@/styles/global";
// import { getToken } from "@/utils/auth";

export default function RootLayout() {
  // const router = useRouter();
  // const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // // runs once to check for token (when component mounts)
  // useEffect(() => {
  //   const checkLogin = async () => {
  //     const token = await getToken();
  //     setIsLoggedIn(!!token);
  //   };
  //   checkLogin();
  // }, []);

  // useEffect((): void => {
  //   if (isLoggedIn === null) return;

  //   // redirect user (depending on login status)
  //   if (isLoggedIn) {
  //     router.replace("/home/vault");
  //   } else {
  //     router.replace("/");
  //   }
  // }, [isLoggedIn]);

  // if (isLoggedIn === null) {
  //   return (
  //     <View style={globalStyles.loadingView}>
  //       <ActivityIndicator size="large" />
  //     </View>
  //   );
  // }

  return (
    <Stack screenOptions={{ headerShown: false }}/>
  );
}
