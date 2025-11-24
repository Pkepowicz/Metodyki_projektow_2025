import { View, Text, ScrollView, Modal, TextInput, Button, Pressable } from "react-native";

import { VaultItem, Section } from "@/app/home/vault"
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";


function PasswordCard({item}: {item: VaultItem}) {
  return (
    <View style={{
      backgroundColor: '#fff',
      padding: 16,
      marginVertical: 8,
      marginHorizontal: 12,
      borderRadius: 12,
      elevation: 3,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowOffset: {width: 0, height: 2},
      shadowRadius: 6
    }}>
      <Text style={{fontSize: 16, fontWeight: 'bold'}}>
        {item.user}
      </Text>

      <Text style={{fontSize: 14, marginTop: 4}}>
        {item.encrypted_password}
      </Text>
    </View>
  )
}

export function PasswordsList({passwords}: {passwords: Section[]}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  
  return (
    <ScrollView>
      {passwords.map(section => {
        const isOpen = open[section.title];

        return (
          <View key={section.title}>
            {/* Clickable domain header */}
            <Pressable
              onPress={() =>
                setOpen(prev => ({ ...prev, [section.title]: !isOpen }))
              }
            >
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                marginTop: 20,
                marginLeft: 12
              }}>
                {section.title} {isOpen ? "▲" : "▼"}
              </Text>
            </Pressable>

            {isOpen &&
              section.data.map((item, index) => (
                <PasswordCard key={index} item={item} />
              ))
            }
          </View>
        );
      })}
    </ScrollView>
  );
}

type AddPasswordModalProps = {
  loadItems: () => void,
  modalVisible: boolean, 
  setModalVisible: (arg1: boolean) => void,
  newSite: string,
  setNewSite: (arg1: string) => void,
  newPassword: string,
  setNewPassword: (arg1: string) => void,
  submitting: boolean,
  setSubmitting: (arg1: boolean) => void
}

export function AddPasswordModal({
    loadItems, modalVisible, setModalVisible, newSite, setNewSite,
    newPassword, setNewPassword, submitting, setSubmitting}: AddPasswordModalProps) {

  async function addItem() {
    try {
      setSubmitting(true);

      const token = await AsyncStorage.getItem("token");

      const response = await fetch("https://leakchecker.mwalas.pl/api/v1/vault/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          site: newSite,
          encrypted_password: newPassword // later substitute encryption
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      // Close modal + reset form
      setNewSite("");
      setNewPassword("");
      setModalVisible(false);

      // Reload list
      await loadItems();

    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <View style={{
          width: '85%',
          backgroundColor: 'white',
          padding: 20,
          borderRadius: 10
        }}>

          <Text style={{ fontSize: 18, marginBottom: 10 }}>Add Vault Item</Text>

          <TextInput
            placeholder="Site (example.com)"
            value={newSite}
            onChangeText={setNewSite}
            style={{
              borderWidth: 1, padding: 10, borderRadius: 6, marginBottom: 10
            }}
          />

          <TextInput
            placeholder="Encrypted Password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            style={{
              borderWidth: 1, padding: 10, borderRadius: 6, marginBottom: 10
            }}
          />

          <Button
            title={submitting ? "Saving..." : "Save"}
            disabled={submitting || newSite === "" || newPassword === ""}
            onPress={addItem}
          />

          <View style={{ height: 10 }} />

          <Button
            title="Cancel"
            color="red"
            onPress={() => setModalVisible(false)}
          />
        </View>
      </View>
    </Modal>
  )
}
