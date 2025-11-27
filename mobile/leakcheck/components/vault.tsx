import { View, Text, Modal, TextInput, Button, Pressable } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { ComStyles } from "@/styles/components";
import { VaultItem, Section } from "@/app/home/vault";
import { decrypt, encrypt } from "@/utils/encryption";

function PasswordCard({
  item,
  onEdit,
  onDelete,
}: {
  item: VaultItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [passwordDecrypted, setPasswordDecrypted] =
    useState<string>("Decrypting...");

  useEffect(() => {
    (async () => {
      const passwordDecrypted = await decrypt(item.encrypted_password);
      setPasswordDecrypted(passwordDecrypted);
    })();
  }, [item.encrypted_password]);

  return (
    <View
      style={{
        backgroundColor: "#fff",
        padding: 18,
        marginVertical: 6,
        marginHorizontal: 10,
        borderRadius: 12,
        elevation: 3,
        alignItems: "center",
        shadowColor: "#000000ff",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
      }}
    >
      <Text style={{ fontSize: 18, fontWeight: "bold" }}>{item.user}</Text>

      <Text style={{ fontSize: 18, marginTop: 4 }}>{passwordDecrypted}</Text>

      <View style={ComStyles.actionsRow}>
        <Pressable onPress={onEdit} style={ComStyles.editButton}>
          <Text style={ComStyles.buttonText}>Edit</Text>
        </Pressable>

        <Pressable onPress={onDelete} style={ComStyles.deleteButton}>
          <Text style={ComStyles.buttonText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function PasswordsList({
  passwords,
  setEditItem,
  setDeleteItem,
}: {
  passwords: Section[];
  setEditItem: (vault_item: VaultItem) => void;
  setDeleteItem: (vault_item: VaultItem) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <View>
      {passwords.map((section) => {
        const isOpen = open[section.title];

        return (
          <View key={section.title}>
            <Pressable
              onPress={() =>
                setOpen((prev) => ({ ...prev, [section.title]: !isOpen }))
              }
            >
              <Text
                style={[
                  {
                    fontSize: 20,
                    fontWeight: "bold",
                    marginVertical: 3,
                    padding: 5,
                  },
                  isOpen && {
                    backgroundColor: "white",
                    borderRadius: 5,
                  },
                ]}
              >
                {section.title} {isOpen ? "▲" : "▼"}
              </Text>
            </Pressable>

            {isOpen &&
              section.data.map((item, index) => (
                <PasswordCard
                  key={index}
                  item={item}
                  onEdit={() => setEditItem(item)}
                  onDelete={() => setDeleteItem(item)}
                />
              ))}
          </View>
        );
      })}
    </View>
  );
}

type AddPasswordModalProps = {
  loadItems: () => void;
  modalVisible: boolean;
  setModalVisible: (arg1: boolean) => void;
  newSite: string;
  setNewSite: (arg1: string) => void;
  newPassword: string;
  setNewPassword: (arg1: string) => void;
  submitting: boolean;
  setSubmitting: (arg1: boolean) => void;
};

export function AddPasswordModal({
  loadItems,
  modalVisible,
  setModalVisible,
  newSite,
  setNewSite,
  newPassword,
  setNewPassword,
  submitting,
  setSubmitting,
}: AddPasswordModalProps) {
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function addItem() {
    try {
      setSubmitting(true);

      const token = await AsyncStorage.getItem("token");

      const masterKey = await AsyncStorage.getItem("master_key");
      if (!masterKey) {
        setErrorMessage("Master key not set. Go to settings");
      } else {
        const encryptedPassword = await encrypt(newPassword);

        const response = await fetch(
          "https://leakchecker.mwalas.pl/api/v1/vault/items",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              site: newSite,
              encrypted_password: encryptedPassword, // later substitute encryption
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        // Close modal + reset form
        setNewSite("");
        setNewPassword("");
        setModalVisible(false);
      }

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
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: "85%",
            backgroundColor: "white",
            padding: 20,
            borderRadius: 10,
          }}
        >
          <Text style={{ fontSize: 18, marginBottom: 10 }}>Add Vault Item</Text>

          {errorMessage && <Text>errorMessage</Text>}

          <TextInput
            placeholder="Site (example.com)"
            value={newSite}
            onChangeText={setNewSite}
            style={{
              borderWidth: 1,
              padding: 10,
              borderRadius: 6,
              marginBottom: 10,
            }}
          />

          <TextInput
            placeholder="Encrypted Password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            style={{
              borderWidth: 1,
              padding: 10,
              borderRadius: 6,
              marginBottom: 10,
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
  );
}

export function EditPasswordModal({
  item,
  onClose,
  onSave,
}: {
  item: VaultItem;
  onClose: () => void;
  onSave: (oldItem: VaultItem, newUser: string, newPassword: string) => void;
}) {
  const [user, setUser] = useState(item.user);
  const [passwordDecrypted, setPasswordDecrypted] = useState("Decrypting...");

  useEffect(() => {
    (async () => {
      const passwordDecrypted = await decrypt(item.encrypted_password);
      setPasswordDecrypted(passwordDecrypted);
    })();
  }, [item.encrypted_password]);

  return (
    <Modal visible={true} transparent>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      >
        <View
          style={{
            backgroundColor: "white",
            padding: 20,
            borderRadius: 10,
            width: "80%",
          }}
        >
          <Text>Edit entry</Text>

          <TextInput
            value={user}
            onChangeText={setUser}
            style={{ borderWidth: 1, padding: 8, marginTop: 10 }}
          />
          <TextInput
            value={passwordDecrypted}
            onChangeText={setPasswordDecrypted}
            style={{ borderWidth: 1, padding: 8, marginTop: 10 }}
          />

          <View
            style={{
              flexDirection: "row",
              marginTop: 30,
              justifyContent: "space-evenly",
            }}
          >
            <Button
              title="Save"
              onPress={() => onSave(item, user, passwordDecrypted)}
            />
            <Button title="Cancel" color="red" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function DeleteConfirmModal({
  item,
  onCancel,
  onConfirm,
}: {
  item: VaultItem;
  onCancel: () => void;
  onConfirm: (item: VaultItem) => void;
}) {
  return (
    <Modal visible={true} transparent>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      >
        <View
          style={{
            backgroundColor: "white",
            padding: 20,
            borderRadius: 10,
            width: "80%",
            alignItems: "center",
          }}
        >
          <Text>Delete this entry?</Text>

          <Text style={{ marginVertical: 10 }}>
            {item.site} {item.user}
          </Text>

          <View style={{ flexDirection: "row", gap: 40 }}>
            <Button
              title="Delete"
              color="#8e57b0ff"
              onPress={() => onConfirm(item)}
            />
            <Button title="Cancel" onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
