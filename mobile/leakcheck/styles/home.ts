import { StyleSheet } from "react-native";

export const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    // alignItems: "center",
    backgroundColor: "#F2F6FF",
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E3A8A",
    marginLeft: 20,
    // textAlign: "center",
    marginTop: 40,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    // textAlign: "center",
    marginLeft: 57,
    marginBottom: 30,
  },
    subsubtitle: {
    fontSize: 24,
    color: "#1E3A8A",
    fontWeight: "700",
    marginLeft: 20,
    // textAlign: "center",
    marginBottom: 7,
  },
  addButton: {
    backgroundColor: "#2563EB",
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 30,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  text: {
    fontSize: 22,
  },
  error: {
    fontSize: 24,
    padding: 10,
    color: "red",
    textAlign: "center",
    marginBottom: 30
  }
});

export const listStyles = StyleSheet.create({
  sectionHeader: {
    paddingTop: 2,
    paddingLeft: 10,
    paddingRight: 10,
    paddingBottom: 2,
    fontSize: 20,
    fontWeight: 'bold',
    backgroundColor: 'rgba(247,247,247,1.0)',
  },
  item: {
    padding: 10,
    fontSize: 18,
    height: 44,
  },
});
