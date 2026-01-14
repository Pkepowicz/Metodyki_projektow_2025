import { homeStyles } from "@/styles/home";
import { leakStyles } from "@/styles/leakchecker";
import { calculateSeconds } from "@/utils/etc";
import { get, post } from "@/utils/requests";
import { copyToClipboard } from "@/utils/storage";
import { Ionicons } from "@expo/vector-icons";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { useFocusEffect } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Secret = {
  id: number;
  token: string;
  owner_id: number;
  max_accesses: number;
  remaining_accesses: number;
  created_at: string;
  expires_at: string | null;
  is_revoked: boolean;
};

export default function SecretsScreen() {
  // Create secret
  const [message, setMessage] = useState<string>("");
  const [link, setLink] = useState<string>("");
  const [gettingLink, setGettingLink] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [maxAccesses, setMaxAccesses] = useState<string>("1");
  const [expirationMinutes, setExpirationMinutes] = useState<string>("10");
  const [expirationHours, setExpirationHours] = useState<string>("");
  const [expirationDays, setExpirationDays] = useState<string>("");
  const [messagePassword, setMessagePassword] = useState<string>("");
  // Display secrets
  const [secretsList, setSecretsList] = useState<Secret[]>([]);
  const [secretsLoading, setSecretsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  async function getSecretLink() {
    setErrorMessage("");
    if (!message) {
      setErrorMessage("Message is empty");
      return;
    }
    if (Number(maxAccesses) < 1) {
      setErrorMessage("Maximum number of accesses too low.");
      return;
    }
    setGettingLink(true);

    try {
      const expirationSeconds: number = calculateSeconds(
        expirationMinutes,
        expirationHours,
        expirationDays
      );

      let messagePasswordHash: string = "";
      if (messagePassword) {
        messagePasswordHash = bytesToHex(sha256(utf8ToBytes(messagePassword)));
      }

      const response = await post("secrets/", {
        content: message,
        max_accesses: Number(maxAccesses),
        expires_in_seconds: expirationSeconds,
        password: messagePasswordHash,
      });

      if (!response.ok) {
        const error = await response.json();
        setErrorMessage(`Error ${response.status}: ${error.detail}`);
        setGettingLink(false);
        return;
      }
      const data = await response.json();
      const secrets_token = await data.token;
      const link = `https://leakchecker.mwalas.pl/secrets/${secrets_token}`;

      setLink(link);
      setGettingLink(false);
      fetchSecrets();
    } catch (e) {
      let errorMessage = "Invalid number";
      if (e instanceof Error) {
        errorMessage = e.message;
      }
      setErrorMessage(errorMessage);
    }
  }

  // fetch list of secrets
  async function fetchSecrets() {
    setErrorMessage("");
    setSecretsLoading(true);
    try {
      const response = await get("secrets/");
      if (!response.ok) {
        const err = await response.json();
        setErrorMessage(
          `Error ${response.status}: ${err.detail || "Failed to load"}`
        );
        setSecretsList([]);
        setSecretsLoading(false);
        return;
      }
      const data = await response.json();

      const now = Date.now();
      // keep only non-expired items (expires_at === null => never expires)
      const list = (Array.isArray(data) ? data : []).filter((s) => {
        if (!s.expires_at) return true;
        const exp = new Date(s.expires_at).getTime() + 3600000; // server returns other timezone
        return exp > now;
      });

      // sort by created_at descending (newest first)
      list.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setSecretsList(list);
    } catch (e) {
      if (e instanceof Error) setErrorMessage(e.message);
      else setErrorMessage("Failed to fetch secrets");
      setSecretsList([]);
    } finally {
      setSecretsLoading(false);
    }
  }

  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!link) return;

    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.02,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [link]);

  // Copy for created secret
  async function handleCopy() {
    await copyToClipboard(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500); // reset after 1.5s
  }
  // Copy for secrets in list
  async function handleCopyUrl(url: string, id: number) {
    await copyToClipboard(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  useFocusEffect(
    React.useCallback(() => {
      fetchSecrets();
    }, [])
  );

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
          <View style={{ justifyContent: "center" }}>
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
            />

            <Text style={{ textAlign: "center" }}>
              How many times can the secret be accessed?
            </Text>
            <TextInput
              value={maxAccesses}
              onChangeText={(text) =>
                setMaxAccesses(text.replace(/[^0-9]/g, ""))
              }
              style={[
                leakStyles.input,
                { width: "30%", marginHorizontal: "auto", marginBottom: 30 },
              ]}
              placeholder="Allowed accesses"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
            />

            <Text style={{ textAlign: "center" }}>Expiration time:</Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 30,
              }}
            >
              <TextInput
                value={expirationMinutes}
                onChangeText={(text) =>
                  setExpirationMinutes(text.replace(/[^0-9]/g, ""))
                }
                style={[
                  leakStyles.input,
                  { width: "30%", marginHorizontal: "2%" },
                ]}
                placeholder="Minutes"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
              />
              <TextInput
                value={expirationHours}
                onChangeText={(text) =>
                  setExpirationHours(text.replace(/[^0-9]/g, ""))
                }
                style={[
                  leakStyles.input,
                  { width: "30%", marginHorizontal: "1%" },
                ]}
                placeholder="Hours"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
              />
              <TextInput
                value={expirationDays}
                onChangeText={(text) =>
                  setExpirationDays(text.replace(/[^0-9]/g, ""))
                }
                style={[
                  leakStyles.input,
                  { width: "30%", marginHorizontal: "2%" },
                ]}
                placeholder="Days"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
              />
            </View>

            <TextInput
              value={messagePassword}
              onChangeText={setMessagePassword}
              placeholder="Secret's password [optional]"
              placeholderTextColor="#6B7280"
              style={[leakStyles.input, { marginBottom: 40 }]}
              secureTextEntry
              textAlignVertical="top"
            />

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
          <View>
            <Animated.View
              style={{
                transform: [{ scale }],
                backgroundColor: "white",
                padding: 14,
                borderRadius: 10,
                marginTop: 50,
                marginBottom: 40,
                marginHorizontal: 20,
                shadowColor: "#000000ff",
                shadowOpacity: 0.1,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: "#6f6f6fff",
                  }}
                  numberOfLines={1}
                >
                  {link}
                </Text>

                <TouchableOpacity
                  onPress={() => {
                    copyToClipboard(link);
                    handleCopy();
                  }}
                >
                  {copied ? (
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={22}
                      color="green"
                    />
                  ) : (
                    <Ionicons name="copy-outline" size={22} color="#555" />
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>

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

        <View style={{ marginTop: 20 }}>
          <Text
            style={{
              textAlign: "center",
              marginBottom: 10,
              marginTop: 40,
              color: "#444",
              fontSize: 24,
            }}
          >
            Created secrets
          </Text>

          {secretsLoading ? (
            <ActivityIndicator />
          ) : secretsList.length === 0 ? (
            <Text style={{ textAlign: "center", color: "#777", fontSize: 20 }}>
              No secrets to display
            </Text>
          ) : (
            secretsList.map((s) => {
              const url = `https://leakchecker.mwalas.pl/secrets/${s.token}`;
              const expires = s.expires_at
                ? new Date(new Date(s.expires_at).getTime() + 3600000)
                : null;
              const expiresText = expires
                ? expires.toLocaleString([], {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Never";

              return (
                <View
                  key={s.id}
                  style={{
                    backgroundColor: "white",
                    padding: 12,
                    borderRadius: 8,
                    marginVertical: 6,
                    marginHorizontal: 20,
                    shadowColor: "#00000022",
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text
                      style={{ flex: 1, fontSize: 13, color: "#333" }}
                      numberOfLines={1}
                    >
                      {url}
                    </Text>
                    <TouchableOpacity onPress={() => handleCopyUrl(url, s.id)}>
                      {copiedId === s.id ? (
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={20}
                          color="green"
                        />
                      ) : (
                        <Ionicons name="copy-outline" size={20} color="#555" />
                      )}
                    </TouchableOpacity>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginTop: 8,
                    }}
                  >
                    <Text style={{ color: "#666" }}>
                      Remaining: {s.remaining_accesses}/{s.max_accesses}
                    </Text>
                    <Text style={{ color: "#666" }}>Exp: {expiresText}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
