import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Modal, Button } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { homeStyles } from "@/styles/home";
import { globalStyles } from "@/styles/global";
import ErrorMessage from "@/components/global";
import { PasswordsList, AddPasswordModal } from "@/components/vault";


export type VaultItem = {
  encrypted_password: string
  user: string
  site: string
}

export type Section = {
  title: string
  data: VaultItem[]
}

export default function VaultScreen() {
  const [passwords, setPasswords] = useState<Section[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newSite, setNewSite] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadItems() {
    try {
      setLoading(true);
      setError(null)

      const token = await AsyncStorage.getItem("token");
      const response = await fetch("https://leakchecker.mwalas.pl/api/v1/vault/items", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`)
      }

      // const items: VaultItem[] = await response.json();

      // TODO: decrypt passwords
      const items = [
        {"encrypted_password": "FWAFR3WREFW", "user": "usertemp", "site": "site1.pl"},
        {"encrypted_password": "GRWGREG32GW", "user": "usertemp2", "site": "site1.pl"},
        {"encrypted_password": "HRAHREE5HET", "user": "usertemp", "site": "site2.com"}
      ]

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
      {error ?(
        <ErrorMessage error={error} retry_function={loadItems}/>
      ) : (
        <View>
          <Text style={homeStyles.title}>🛡️ Welcome to your Vault 🛡️</Text>
          <Button title="Add Password" onPress={() => setModalVisible(true)} />
          <PasswordsList passwords={passwords}/>
          <AddPasswordModal
            loadItems={loadItems}
            modalVisible={modalVisible} setModalVisible={setModalVisible}
            newSite={newSite} setNewSite={setNewSite}
            newPassword={newPassword} setNewPassword={setNewPassword}
            submitting={submitting} setSubmitting={setSubmitting}
          />
        </View>
      )}
    </View>
  );
}
