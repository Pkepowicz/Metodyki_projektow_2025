import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import ErrorMessage from "@/components/global";
import {
  AddPasswordModal,
  DeleteConfirmModal,
  EditPasswordModal,
  PasswordsList,
} from "@/components/vault";
import { globalStyles } from "@/styles/global";
import { homeStyles } from "@/styles/home";
import { logout } from "@/utils/auth";
import { get, put, del } from "@/utils/requests";
import { encryptVaultPassword } from "@/utils/encryption";

export type VaultItem = {
  id: number;
  encrypted_password: string;
  user: string;
  site: string;
};

export type Section = {
  title: string;
  data: VaultItem[];
};

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

  const router = useRouter();

  async function loadItems() {
    try {
      setLoading(true);
      setError(null);

      const response = await get("vault/items");

      if (!response.ok) {
        if (response.status == 401) {
          logout(router);
          return;
        }
        const error = await response.json()
        throw new Error(`Server returned error ${response.status}: ${error.detail}`);
      }

      const items: VaultItem[] = await response.json();

      // Group items by site
      const grouped: Section[] = Object.values(
        items.reduce<Record<string, Section>>((acc, item) => {
          if (!acc[item.site]) {
            acc[item.site] = { title: item.site, data: [] };
          }
          acc[item.site].data.push(item);
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
  //fetch passwords when added in leakchecker vault
  useFocusEffect(
    React.useCallback(() => {
      loadItems();
    }, [])
  );

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
  try {

    const encryptedPassword = await encryptVaultPassword(newPassword);

    const response = await put(`vault/items/${oldItem.id}`, {
      site: newUser, 
      encrypted_password: encryptedPassword,
    });

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Error ${response.status}: ${error.detail}`);
    }

    setEditItem(null);
    await loadItems(); 
  } catch (err: any) {
    alert("Error updating item: " + err.message);
  }
}

async function confirmDelete(item: VaultItem) {
  try {

    const response = await del(`vault/items/${item.id}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Error ${response.status}: ${error.detail}`);
    }

    setDeleteItem(null);
    await loadItems();
  } catch (err: any) {
    alert("Error deleting item: " + err.message);
  }
}

  return (
    <View style={homeStyles.container}>
      {error ? (
        <ErrorMessage error={error} retry_function={loadItems} />
      ) : (
        <ScrollView>
          <Text style={homeStyles.title}>🛡️ Leakchecker Vault</Text>
          <Text style={homeStyles.subtitle}>Secure passwords in one place</Text>

          <TouchableOpacity
            style={homeStyles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={homeStyles.addButtonText}>＋ Add credentials</Text>
          </TouchableOpacity>

          <Text style={homeStyles.subsubtitle}>🔑 Saved credentials</Text>

          <TextInput
            placeholder="Search domains…"
            placeholderTextColor="#6B7280"
            value={search}
            onChangeText={setSearch}
            style={{
              marginHorizontal: 20,
              marginBottom: 16,
              backgroundColor: "#FFFFFF",
              paddingVertical: 14,
              paddingHorizontal: 16,
              borderRadius: 14,
              borderWidth: 0,
              shadowColor: "#000",
              shadowOpacity: 0.05,
              shadowRadius: 6,
              elevation: 2,
            }}
          />

          {/* ScrollView could only wrap the PasswordsList, but doesn't work on web.*/}
          <PasswordsList
            setEditItem={setEditItem}
            setDeleteItem={setDeleteItem}
            passwords={passwords.filter((p) =>
              p.title.toLowerCase().includes(search.toLowerCase())
            )}
          />

          <AddPasswordModal
            loadItems={loadItems}
            modalVisible={modalVisible}
            setModalVisible={setModalVisible}
            newSite={newSite}
            setNewSite={setNewSite}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            submitting={submitting}
            setSubmitting={setSubmitting}
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
        </ScrollView>
      )}
    </View>
  );
}
