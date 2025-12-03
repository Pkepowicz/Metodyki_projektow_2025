import { homeStyles } from "@/styles/home";
import { settingsStyle } from "@/styles/settings";
import { post } from "@/utils/requests";
import { copyToClipboard } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function SecretsScreen() {
  const [message, setMessage] = useState<string>("");
  const [link, setLink] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function getSecretLink() {
    const response = await post("/secrets", {
      message: message,
    });
    if (!response.ok) {
      const error = await response.json();
      setErrorMessage("Error " + error.detail);
    }
    const data = await response.json();

    setLink(data.link);
  }

  return (
    <View style={homeStyles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={homeStyles.title}>🤫 Secrets</Text>
        <Text style={homeStyles.subtitle}>
          Write a secret message and share.
        </Text>

        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Your secret message"
          style={[settingsStyle.input, { height: 60, paddingTop: 10 }]}
          multiline
          textAlignVertical="top"
        ></TextInput>

        {errorMessage && <Text style={homeStyles.error}>{errorMessage}</Text>}

        <TouchableOpacity onPress={getSecretLink}>
          <Text>Get a link</Text>
        </TouchableOpacity>

        {link && (
          <View style={{ marginTop: 20 }}>
            <Text style={{ fontWeight: "bold", marginBottom: 6 }}>
              Your Link:
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ flex: 1 }}>{link}</Text>
              <TouchableOpacity
                onPress={() => {
                  copyToClipboard(link);
                }}
              >
                <Ionicons name="copy-outline" size={22} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
