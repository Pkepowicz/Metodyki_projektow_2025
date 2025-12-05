import { homeStyles } from "@/styles/home";
import { leakStyles } from "@/styles/leakchecker";
import { post } from "@/utils/requests";
import { copyToClipboard } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function SecretsScreen() {
  const [message, setMessage] = useState<string>("");
  const [link, setLink] = useState<string>("");
  const [gettingLink, setGettingLink] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function getSecretLink() {
    setErrorMessage("");
    if (!message) {
      setErrorMessage("Message is empty");
      return;
    }
    setGettingLink(true);

    // TODO: mock, delete later
    const MOCK = true;
    if (MOCK) {
      setLink("https://secretlink.com/te$T");
      setGettingLink(false);
      return;
    }

    const response = await post("/secrets", {
      message: message,
    });
    if (!response.ok) {
      const error = await response.json();
      setErrorMessage("Error: " + error.detail);
      setGettingLink(false);
      return;
    }
    const data = await response.json();

    setLink(data.link);
    setGettingLink(false);
  }

  return (
    <View style={homeStyles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={homeStyles.title}>🤫 Secrets</Text>
        <Text style={homeStyles.subtitle}>
          Write a secret message and share.
        </Text>

        {errorMessage && (
          <Text style={leakStyles.errorText}>{errorMessage}</Text>
        )}

        {link == "" ? (
          <View>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="Your secret message"
              placeholderTextColor="#6B7280"
              style={[
                leakStyles.input,
                { height: 100, paddingVertical: 10, marginBottom: 30 },
              ]}
              multiline
              textAlignVertical="top"
            ></TextInput>

            <TouchableOpacity
              style={[
                homeStyles.addButton,
                { marginBottom: 5 },
                gettingLink && { opacity: 0.6 },
              ]}
              onPress={getSecretLink}
              disabled={gettingLink}
            >
              {gettingLink ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={homeStyles.addButtonText}>Get a link</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
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

            <View>
              <TouchableOpacity
                style={homeStyles.addButton}
                onPress={() => {
                  setLink("");
                }}
              >
                <Text style={homeStyles.addButtonText}>
                  Create a new secret
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
