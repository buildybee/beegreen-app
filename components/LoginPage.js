import React, { useState } from "react";
import {
  View,
  TextInput,
  Button,
  StyleSheet,
  SafeAreaView,
  Text,
  Alert,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import Paho from "paho-mqtt";

const LoginPage = ({ navigation }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mqttServer, setMqttServer] = useState("");
  const [mqttPort, setMqttPort] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const handleLogin = () => {
    if (!username || !password || !mqttServer || !mqttPort) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    setIsConnecting(true);

    // Initialize MQTT client
    const mqttClient = new Paho.Client(
      mqttServer,
      Number(mqttPort),
      "clientId-" + Math.random().toString(16).substr(2, 8)
    );

    // Set callback handlers
    mqttClient.onConnectionLost = (responseObject) => {
      setIsConnecting(false);
      if (responseObject.errorCode !== 0) {
        Alert.alert("Error", "Connection lost: " + responseObject.errorMessage);
      }
    };

    // Connect to the MQTT broker
    mqttClient.connect({
      onSuccess: () => {
        console.log("Connected to MQTT broker");
        setIsConnecting(false);

        // Save configuration to SecureStore
        const config = {
          mqttServer,
          mqttPort,
          mqttUser: username,
          mqttPassword: password,
        };
        SecureStore.setItemAsync("config", JSON.stringify(config))
          .then(() => {
            Alert.alert("Success", "Configuration saved successfully.");
            navigation.replace("Control"); // Navigate to Control Page
          })
          .catch((error) => {
            console.error("Error saving configuration:", error);
            Alert.alert("Error", "Failed to save configuration.");
          });
      },
      onFailure: (err) => {
        setIsConnecting(false);
        Alert.alert("Error", "Failed to connect to MQTT broker: " + err.errorMessage);
      },
      useSSL: true,
      userName: username,
      password: password,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Login</Text>

      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        style={styles.input}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      <TextInput
        placeholder="MQTT Server"
        value={mqttServer}
        onChangeText={setMqttServer}
        style={styles.input}
      />
      <TextInput
        placeholder="MQTT Port"
        value={mqttPort}
        onChangeText={setMqttPort}
        keyboardType="numeric"
        style={styles.input}
      />

      <Button
        title={isConnecting ? "Connecting..." : "Login"}
        onPress={handleLogin}
        disabled={isConnecting}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#228B22",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  header: {
    fontSize: 24,
    color: "#fff",
    marginBottom: 20,
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "#fff",
    padding: 10,
    width: "100%",
    marginBottom: 15,
    borderRadius: 5,
  },
});

export default LoginPage;