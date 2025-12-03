import { ComStyles } from "@/styles/components";
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";

type ChangePasswordModalProps = {
  modalVisible: boolean;
  setModalVisible: (arg: boolean) => void;
  errorMessage: string;
  submitting: boolean;
  email: string;
  setEmail: (arg: string) => void;
  oldPassword: string;
  setOldPassword: (arg: string) => void;
  newPassword: string;
  setNewPassword: (arg: string) => void;
  confirmPassword: string;
  setConfirmPassword: (arg: string) => void;
  changePassword: () => void;
};

export function ChangePasswordModal({
  modalVisible,
  setModalVisible,
  errorMessage,
  submitting,
  email,
  setEmail,
  oldPassword,
  setOldPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  changePassword,
}: ChangePasswordModalProps) {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={ComStyles.modalOverlay}>
        <View style={ComStyles.modalContainer}>
          <Text style={ComStyles.modalTitle}>Change password</Text>

          {errorMessage && (
            <Text style={ComStyles.errorText}>{errorMessage}</Text>
          )}

          <TextInput
            placeholder="Old password"
            placeholderTextColor="#6B7280"
            value={oldPassword}
            onChangeText={setOldPassword}
            style={ComStyles.modalInput}
          />

          <TextInput
            placeholder="New password"
            placeholderTextColor="#6B7280"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            style={ComStyles.modalInput}
          />

          <TextInput
            placeholder="Confirm new password"
            placeholderTextColor="#6B7280"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            style={ComStyles.modalInput}
          />

          <View style={ComStyles.modalButtons}>
            <TouchableOpacity
              style={[ComStyles.button, ComStyles.saveButton]}
              onPress={changePassword}
              disabled={
                submitting ||
                oldPassword === "" ||
                newPassword === "" ||
                confirmPassword === ""
              }
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
