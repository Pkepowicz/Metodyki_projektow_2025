import { StyleSheet } from "react-native";

export const leakStyles = StyleSheet.create({
  input: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    fontSize: 16,
  },

  errorText: {
    color: "#E53935",
    marginTop: 8,          
    textAlign: "center",  
    fontSize: 14,
  },

  successText: {
    color: "#2E7D32",
    marginTop: 8,         
    textAlign: "center",   
    fontSize: 14,
  },

});
