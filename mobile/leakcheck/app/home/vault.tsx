import React, { useEffect, useState } from "react";
import { View, Text, SectionList, ActivityIndicator, Button } from "react-native";

import { homeStyles, listStyles } from "@/styles/home";
import { globalStyles } from "@/styles/global";


type VaultItem = {
  encrypted_password: string;
  site: string;
};

type Section = {
  title: string;
  data: string[];
};

export default function VaultScreen() {
  const [passwords, setPasswords] = useState<Section[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadItems() {
    try {
      setLoading(true);
      setError(null)
      /*
      const response = await fetch("https://127.0.0.1:8000/vault/items");
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }

      const items: VaultItem[] = await response.json();
      */
      const items = [
        { "encrypted_password": "FWAFR3WREFW",  "site": "site1.pl" },
        { "encrypted_password": "GRWGREG32GW",  "site": "site1.pl" },
        { "encrypted_password": "HRAHREE5HET",  "site": "site2.com" }
      ]; // TODO delete and uncomment fetching

      // Group items by site
      const grouped = Object.values(
        items.reduce<Record<string, Section>>((acc, item) => {
          if (!acc[item.site]) {
            acc[item.site] = { title: item.site, data: [] };
          }
          acc[item.site].data.push(item.encrypted_password);
          return acc;
        }, {})
      );

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
      
      {error && (
        <View style={{alignItems: "center"}}>
          <Text style={homeStyles.error}>Error occured: {error}</Text>
          <View style={{width: 100}}>
            <Button title="Try Again" onPress={loadItems} />
          </View>
        </View>
      )}
      
      <SectionList
        sections={passwords}
        renderItem={({item}) => <Text style={listStyles.item}>{item}</Text>}
        renderSectionHeader={({section}) => (
          <Text style={listStyles.sectionHeader}>{section.title}</Text>
        )}
        keyExtractor={(item, index) => item + index}
      />
    </View>
  );
}
