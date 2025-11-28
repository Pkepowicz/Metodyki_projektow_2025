import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export async function set_key_value(key: string, value: string) {
  if (Platform.OS === "web") {
    // web
    await AsyncStorage.setItem(key, value);
  } else {
    // mobile
    await SecureStore.setItemAsync(key, value);
  }
}

export async function get_key_value(key: string): Promise<string | null> {
  return Platform.OS === "web"
    ? await AsyncStorage.getItem(key)
    : await SecureStore.getItemAsync(key);
}
