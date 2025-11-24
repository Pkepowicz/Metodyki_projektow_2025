import { StyleSheet } from "react-native";

export const loginStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  input: {
    fontSize: 22,
    padding: 5,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#2196f3",
    margin: 5
  },
  error: {
    fontSize: 24,
    color: "red"
  }
});
