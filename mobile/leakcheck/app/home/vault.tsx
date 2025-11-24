import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Button, TextInput } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { homeStyles } from "@/styles/home";
import { globalStyles } from "@/styles/global";
import ErrorMessage from "@/components/global";
import { PasswordsList, AddPasswordModal, EditPasswordModal, DeleteConfirmModal } from "@/components/vault";


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
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState<VaultItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<VaultItem | null>(null);

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

      const items: VaultItem[] = await response.json();

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

  async function saveEdit(oldItem: VaultItem, newUser: string, newPassword: string) {
    // TODO: call API PUT here
    console.log("update", oldItem, newUser, newPassword);

    setEditItem(null);
    loadItems();
  }

  async function confirmDelete(item: VaultItem) {
    // TODO: call API DELETE here
    console.log("delete", item);

    setDeleteItem(null);
    loadItems();
  }

  return (
    <View style={homeStyles.container}>
      {error ? (
        <ErrorMessage error={error} retry_function={loadItems}/>
      ) : (
        <View>
          <Text style={homeStyles.title}>🛡️ Welcome to your Vault 🛡️</Text>
          
          <Button title="Add Password" onPress={() => setModalVisible(true)} />

          <TextInput
            placeholder="Search domains…"
            value={search}
            onChangeText={setSearch}
            style={{
              marginTop: 50,
              marginBottom: 10,
              marginHorizontal: 12,
              backgroundColor: "#f6faffff",
              padding: 10,
              borderRadius: 3,
              borderWidth: 1,
            }}
          />
          <PasswordsList
            setEditItem={setEditItem}
            setDeleteItem={setDeleteItem}
            passwords={passwords.filter(p =>
              p.title.toLowerCase().includes(search.toLowerCase())
            )}
          />
          <AddPasswordModal
            loadItems={loadItems}
            modalVisible={modalVisible} setModalVisible={setModalVisible}
            newSite={newSite} setNewSite={setNewSite}
            newPassword={newPassword} setNewPassword={setNewPassword}
            submitting={submitting} setSubmitting={setSubmitting}
          />
          {editItem && (
            <EditPasswordModal
              item={editItem}
              onClose={() => setEditItem(null)}
              onSave={saveEdit}
            />
          )}

          {deleteItem && (
            <DeleteConfirmModal
              item={deleteItem}
              onCancel={() => setDeleteItem(null)}
              onConfirm={confirmDelete}
            />
          )}
        </View>
      )}
    </View>
  );
}
