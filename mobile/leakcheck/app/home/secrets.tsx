import { homeStyles } from "@/styles/home";
import { post } from "@/utils/requests";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

export default function SecretsScreen() {
  const [message, setMessage] = useState<string>("");

  async function getSecretLink() {
    const response = post("/secrets", {});
  }

  return (
    <View style={homeStyles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={homeStyles.title}>🤫 Leakchecker</Text>
        <Text style={homeStyles.subtitle}>
          Check if your password has been leaked
        </Text>
      </ScrollView>
    </View>
  );
}
