import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { homeStyles } from "@/styles/home";
import { globalStyles } from "@/styles/global";
import ErrorMessage from "@/components/global";
import PasswordsList from "@/components/vault";


export type PasswordItem = {
  encrypted_password: string
  user: string
  site: string
}

export type Section = {
  title: string
  data: PasswordItem[]
}

export default function VaultScreen() {
  const [passwords, setPasswords] = useState<Section[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadItems() {
    try {
      setLoading(true);
      setError(null)

      const token = await AsyncStorage.getItem("token")
      // const response = await fetch("http://127.0.0.1:8000/api/v1/vault/items", {
      //   method: "GET",
      //   headers: {
      //     "Content-Type": "application/json",
      //     "Authorization": `Bearer ${token}`
      //   }
      // });
      // if (!response.ok) {
      //   throw new Error(`Server returned ${response.status}`)
      // }

      // const items: VaultItem[] = await response.json();
      const items = [
        {"encrypted_password": "FWAFR3WREFW", "user": "usertemp", "site": "site1.pl"},
        {"encrypted_password": "GRWGREG32GW", "user": "usertemp2", "site": "site1.pl"},
        {"encrypted_password": "HRAHREE5HET", "user": "usertemp", "site": "site2.com"}
      ]

      // TODO: decrypt passwords

      // Group items by site
      const grouped: Section[] = Object.values(
      items.reduce<Record<string, Section>>((acc, item) => {
        if (!acc[item.site]) {
          acc[item.site] = { title: item.site, data: [] }
        }
        acc[item.site].data.push(item)
        return acc
      }, {})
      )

      setPasswords(grouped);
    } catch (err: any) {
      setError(err.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  // fetch passwords in vault
  useEffect(() => {
    loadItems();
  }, []);

  if (loading) {
    return (
      <View style={globalStyles.loadingView}>
        <ActivityIndicator size="large" />
        <Text style={{ paddingTop: 10 }}>Loading vault…</Text>
      </View>
    );
  }

  return (
    <View style={homeStyles.container}>
      <Text style={homeStyles.title}>🛡️ Welcome to your Vault 🛡️</Text>
      {error && <ErrorMessage error={error} retry_function={loadItems}/>}
      <PasswordsList passwords={passwords}/>
    </View>
  );
}
