import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function HomeLayout() {
  return (
    <Tabs>
      {/* <Tabs.Screen name="vault" options={{ title: "Vault" }} />
       */}

      <Tabs.Screen
        name="vault"
        options={{
          title: "Vault",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="lock-closed-outline" size={size} color={color} />
          ),
            headerShown: false, 
        }}
      />
        <Tabs.Screen
          name="leakcheck"
          options={{
            title: "LeakCheck",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="alert-circle-outline" size={size} color={color} />
            ),
            headerShown: false, 
          }}
        />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
            headerShown: false, 
        }}
      />
    </Tabs>
  );
}
