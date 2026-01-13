import React, { useState, useEffect } from "react";
import {
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Slider from "@react-native-community/slider";
import "react-native-get-random-values";
import { ComStyles } from "@/styles/components";


function generateSecurePassword(length: number) {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const symbols = "!@#$%^&*()_+";

  const all = upper + lower + digits + symbols;

  if (length < 12) {
    throw new Error("Password length must be at least 12");
  }

  const passwordChars: string[] = [];

  passwordChars.push(upper[secureRandomInt(upper.length)]);
  passwordChars.push(lower[secureRandomInt(lower.length)]);
  passwordChars.push(digits[secureRandomInt(digits.length)]);
  passwordChars.push(symbols[secureRandomInt(symbols.length)]);

  for (let i = passwordChars.length; i < length; i++) {
    passwordChars.push(all[secureRandomInt(all.length)]);
  }

  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [passwordChars[i], passwordChars[j]] = [
      passwordChars[j],
      passwordChars[i],
    ];
  }

  return passwordChars.join("");
}

function secureRandomInt(max: number) {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

function generatePassphrase(wordsCount: number, separator: string) {
  const WORDS = [
  "absorb","academy","account","acoustic","adapt","aerial","agent","alchemy","anchor","angle",
  "archive","arrow","aspect","asset","atomic","balance","battery","binary","bishop","blanket",
  "border","branch","bridge","buffer","cannon","carbon","castle","census","channel","cipher",
  "cluster","column","command","compass","concept","console","crystal","current","cursor","cycle",
  "damage","delta","density","device","digital","domain","dragon","dynamic","ember","engine",
  "entity","epoch","escape","factor","falcon","feature","filter","forest","format","galaxy",
  "gateway","genesis","gradient","gravity","hammer","harbor","horizon","impact","index","inertia",
  "infinite","insight","isolate","kernel","kingdom","ladder","laser","legend","library","logic",
  "machine","matrix","memory","method","module","moment","motion","nebula","network","object",
  "offset","oracle","orbit","origin","packet","parallel","pattern","payload","phantom","planet",
  "pointer","polygon","quantum","random","reactor","record","region","remote","render","resource",
  "river","rocket","sandbox","satellite","schema","signal","socket","spectrum","system","tensor",
  "thread","token","torrent","tracker","transit","trigger","tunnel","unicorn","vector","velocity",
  "version","virtual","vision","voyage","window","zenith","zero","zone"
];

  const result: string[] = [];

  for (let i = 0; i < wordsCount; i++) {
    let word = WORDS[secureRandomInt(WORDS.length)];

    if (secureRandomInt(2) === 1) {
      word = word[0].toUpperCase() + word.slice(1);
    }

    if (secureRandomInt(4) === 1) {
      word += secureRandomInt(100).toString();
    }

    result.push(word);
  }

  return result.join(separator);
}


function getPasswordStrength(password: string) {
  let score = 0;

  if (password.length >= 8) score += 1;  
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

  score = Math.max(0, score);
  score = Math.min(10, score); 

  if (score <= 2) return { label: "Weak", color: "#FF0000", width: 25 };
  if (score <= 5) return { label: "Medium", color: "#FF8C00", width: 50 };
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
  const [separator, setSeparator] = useState("-");

  const handleGeneratePassword = () => {
    setIsPassphrase(false);
    setPassword(generateSecurePassword(passwordLength));
  };

  const handleGeneratePassphrase = () => {
  setIsPassphrase(true);
  setPassword(generatePassphrase(passphraseWords, separator));
};


  const strength = getPasswordStrength(password);

  useEffect(() => {
    if (isPassphrase) {
      const defaultWords = 6; 
      setPassphraseWords(defaultWords);
      setPassword(generatePassphrase(defaultWords, separator));
    } else {
      const defaultLength = 12;
      setPasswordLength(defaultLength);
      setPassword(generateSecurePassword(defaultLength));
    }
  }, [isPassphrase]); 


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
          {isPassphrase && (
            <View style={{ flexDirection: "row", marginBottom: 8 }}>
              {["-", "_", ".", " "].map((sep) => (
                <TouchableOpacity
                  key={sep}
                  style={[
                    ComStyles.button,
                    {
                      paddingHorizontal: 12,
                      backgroundColor:
                        separator === sep ? "#a10964ff" : "#ccc",
                      marginRight: 6,
                    },
                  ]}
                  onPress={() => setSeparator(sep)}
                >
                  <Text style={ComStyles.buttonText}>
                    {sep === " " ? "Space" : sep}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
