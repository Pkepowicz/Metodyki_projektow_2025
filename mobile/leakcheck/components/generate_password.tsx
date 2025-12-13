import React, { useState } from "react";
import {
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import { ComStyles } from "@/styles/components";


function generateRandomPassword(length: number) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generatePassphrase(wordsCount: number) {
  const words = [
    "apple", "banana", "cat", "dog", "elephant", "flower",
    "grape", "house", "ice", "jungle", "kite", "lion",
    "moon", "night", "orange", "pumpkin",
  ];
  let result: string[] = [];
  for (let i = 0; i < wordsCount; i++) {
    result.push(words[Math.floor(Math.random() * words.length)]);
  }
  return result.join("-");
}

function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (/(.)\1{2,}/.test(password)) score -= 1;

  const commonPatterns = [
    /(password|qwerty|123456|abcdef)/i,
    /[A-Z][a-z]+[0-9]+/  
  ];
  if (commonPatterns.some((regex) => regex.test(password))) score -= 1;

  score = Math.max(0, Math.min(8, score));

  if (score <= 2) return { label: "Weak", color: "#FF0000", width: 25 };
  if (score <= 4) return { label: "Medium", color: "#FF8C00", width: 50 };
  if (score <= 6) return { label: "Strong", color: "#008000", width: 75 };
  return { label: "Very Strong", color: "#9400D3", width: 100 };
}

type GeneratePasswordModalProps = {
  visible: boolean;
  onClose: () => void;
  onSave: (generatedPassword: string) => void;
};

export default function GeneratePasswordModal({
  visible,
  onClose,
  onSave,
}: GeneratePasswordModalProps) {
  const [password, setPassword] = useState("");
  const [passwordLength, setPasswordLength] = useState(16);
  const [passphraseWords, setPassphraseWords] = useState(4);
  const [isPassphrase, setIsPassphrase] = useState(false);

  const handleGeneratePassword = () => {
    setIsPassphrase(false);
    setPassword(generateRandomPassword(passwordLength));
  };

  const handleGeneratePassphrase = () => {
    setIsPassphrase(true);
    setPassword(generatePassphrase(passphraseWords));
  };

  const strength = getPasswordStrength(password);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={ComStyles.modalOverlay}>
        <View style={ComStyles.modalContainer}>
          <Text style={ComStyles.modalTitle}>Generate Password</Text>

          <View style={{ marginVertical: 12 }}>
            <Text>
              {isPassphrase ? `Words: ${passphraseWords}` : `Length: ${passwordLength}`}
            </Text>
            <Slider
              minimumValue={isPassphrase ? 2 : 12}
              maximumValue={isPassphrase ? 6 : 48}
              step={1}
              value={isPassphrase ? passphraseWords : passwordLength}
              onValueChange={(val) => {
                if (isPassphrase) setPassphraseWords(val);
                else setPasswordLength(val);
              }}
            />
          </View>

          {!isPassphrase && password.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <View
                style={{
                  height: 6,
                  width: "100%",
                  backgroundColor: "#e0e0e0",
                  borderRadius: 3,
                }}
              >
                <View
                  style={{
                    height: 6,
                    width: `${strength.width}%`,
                    backgroundColor: strength.color,
                    borderRadius: 3,
                  }}
                />
              </View>
              <Text style={{ marginTop: 4, color: strength.color, fontWeight: "600" }}>
                {strength.label}
              </Text>
            </View>
          )}

          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder={isPassphrase ? "Generated passphrase" : "Generated password"}
            placeholderTextColor="#6B7280"
            secureTextEntry={false}
            style={ComStyles.modalInput}
          />

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
            <TouchableOpacity
              style={[ComStyles.button, { backgroundColor: "#a10964ff", marginRight: 8 }]}
              onPress={handleGeneratePassword}
            >
              <Text style={ComStyles.buttonText}>Password</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[ComStyles.button, { backgroundColor: "#a10964ff", marginLeft: 8 }]}
              onPress={handleGeneratePassphrase}
            >
              <Text style={ComStyles.buttonText}>Passphrase</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 20 }}>
            <TouchableOpacity
              style={[ComStyles.button, ComStyles.saveButton]}
              onPress={() => {
                onSave(password);
                setPassword("");
                setIsPassphrase(false);
                setPasswordLength(16);
                setPassphraseWords(4);
                onClose();
              }}
            >
              <Text style={ComStyles.buttonText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[ComStyles.button, ComStyles.cancelButton]}
              onPress={() => {
                setPassword("");
                setIsPassphrase(false);
                setPasswordLength(16);
                setPassphraseWords(4);
                onClose();
              }}
            >
              <Text style={ComStyles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
