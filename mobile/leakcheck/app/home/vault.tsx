import React, { useEffect, useState } from "react";
import { View, Text, SectionList } from "react-native";

import { homeStyles, listStyles } from "@/styles/home";


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

  // fetch passwords in vault
  useEffect(() => {
    async function loadItems() {
      try {
        setError(null)

        const response = await fetch("https://127.0.0.1:8000/vault/items");
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`)
        }

        const items: VaultItem[] = await response.json();

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
      }
    }

    loadItems();

  }, []);

  return (
    <View style={homeStyles.container}>
      <Text style={homeStyles.title}>🛡️ Welcome to your Vault 🛡️</Text>
      
      {error && (
        <Text style={homeStyles.error}>Error occured: {error}</Text>
      )}
      
      <SectionList
        sections={passwords}
        renderItem={({item}) => <Text style={listStyles.item}>{item}</Text>}
        renderSectionHeader={({section}) => (
          <Text style={listStyles.sectionHeader}>{section.title}</Text>
        )}
        keyExtractor={(item: string, index: string) => item + index}
      />
    </View>
  );
}
