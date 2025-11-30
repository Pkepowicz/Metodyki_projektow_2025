import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export async function set_key_value(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);  // web
  } else {
    await SecureStore.setItemAsync(key, value);  // mobile
  }
}

export async function get_key_value(key: string): Promise<string | null> {
  return Platform.OS === "web"
    ? await AsyncStorage.getItem(key)
    : await SecureStore.getItemAsync(key);
}

export async function remove_key(key: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key)
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}
