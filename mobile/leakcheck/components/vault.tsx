import { Section, VaultItem } from "@/app/home/vault";
import { ComStyles } from "@/styles/components";
import { getToken } from "@/utils/auth";
import {
  decryptVaultPassword,
  encryptVaultPassword,
  getVaultKey,
} from "@/utils/encryption";
import { post } from "@/utils/requests";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
      try {
        var password = await decryptVaultPassword(item.encrypted_password);
        if (!password) {
          password = "Could not decrypt. Probably the master key is wrong";
        }
        setPasswordDecrypted(password);
      } catch (error) {
        if (error instanceof Error) {
          setPasswordDecrypted(error.message);
        }
      }
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
      const token = await getToken();
      const vault_key = getVaultKey();

      if (vault_key == null) {
        setErrorMessage(
          "Master key not set. This should not have happened. No idea what to do now to be honest..."
        );
      } else {
        const encryptedPassword = await encryptVaultPassword(newPassword);

        const response = await post("vault/items", {
          site: newSite,
          encrypted_password: encryptedPassword,
        });

        if (!response.ok) {
          setErrorMessage("Error:" + response.text());
        } else {
          // Close modal + reset form
          setNewSite("");
          setNewPassword("");
          setModalVisible(false);
        }
      }

      // Reload list
      await loadItems();
    } catch (err: any) {
      setErrorMessage("Error:" + err);
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
      <View style={ComStyles.modalOverlay}>
        <View style={ComStyles.modalContainer}>
          <Text style={ComStyles.modalTitle}>Add Vault Item</Text>

          {errorMessage && (
            <Text style={ComStyles.errorText}>{errorMessage}</Text>
          )}

          <TextInput
            placeholder="Site (example.com)"
            placeholderTextColor="#6B7280"
            value={newSite}
            onChangeText={setNewSite}
            style={ComStyles.modalInput}
          />

          <TextInput
            placeholder="Encrypted Password"
            placeholderTextColor="#6B7280"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            style={ComStyles.modalInput}
          />

          <View style={ComStyles.modalButtons}>
            <TouchableOpacity
              style={[ComStyles.button, ComStyles.saveButton]}
              onPress={addItem}
              disabled={submitting || newSite === "" || newPassword === ""}
            >
              <Text style={ComStyles.buttonText}>
                {submitting ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[ComStyles.button, ComStyles.cancelButton]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={ComStyles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
      try {
        var password = await decryptVaultPassword(item.encrypted_password);
        if (!password) {
          password = "Could not decrypt. Probably the master key is wrong";
        }
        setPasswordDecrypted(password);
      } catch (error) {
        if (error instanceof Error) {
          setPasswordDecrypted(error.message);
        }
      }
    })();
  }, [item.encrypted_password]);

  return (
    <Modal visible={true} transparent>
      <View style={ComStyles.modalOverlay}>
        <View style={ComStyles.modalContainer}>
          <Text style={ComStyles.modalTitle}>Edit Entry</Text>

          <TextInput
            value={user}
            onChangeText={setUser}
            placeholder="Domain"
            placeholderTextColor="#6B7280"
            style={ComStyles.modalInput}
          />

          <TextInput
            value={passwordDecrypted}
            onChangeText={setPasswordDecrypted}
            placeholder="Password"
            placeholderTextColor="#6B7280"
            secureTextEntry
            style={ComStyles.modalInput}
          />

          <View style={ComStyles.modalButtons}>
            <TouchableOpacity
              style={[ComStyles.button, ComStyles.saveButton]}
              onPress={() => onSave(item, user, passwordDecrypted)}
            >
              <Text style={ComStyles.buttonText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[ComStyles.button, ComStyles.cancelButton]}
              onPress={onClose}
            >
              <Text style={ComStyles.buttonText}>Cancel</Text>
            </TouchableOpacity>
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
      <View style={ComStyles.modalOverlay}>
        <View
          style={[
            ComStyles.modalContainer,
            { alignItems: "center", width: "80%" },
          ]}
        >
          <Text style={ComStyles.modalTitle}>Delete this entry?</Text>

          <Text style={{ marginVertical: 10, textAlign: "center" }}>
            {item.site} {item.user}
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              width: "100%",
              marginTop: 20,
            }}
          >
            <TouchableOpacity
              style={[ComStyles.button, { backgroundColor: "#DC2626" }]}
              onPress={() => onConfirm(item)}
            >
              <Text style={ComStyles.buttonText}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[ComStyles.button, ComStyles.cancelButton]}
              onPress={onCancel}
            >
              <Text style={ComStyles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
