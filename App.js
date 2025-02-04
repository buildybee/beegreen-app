import React, { useState } from "react";
import {
  StyleSheet,
  SafeAreaView,
  TextInput,
  Text,
  Button,
  View,
  TouchableOpacity,
  Alert,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import { MaterialIcons } from "@expo/vector-icons";

export default function App() {
  const [wifiSSID, setWifiSSID] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [mqttServer, setMqttServer] = useState("");
  const [mqttPort, setMqttPort] = useState("");
  const [mqttUser, setMqttUser] = useState("");
  const [mqttPassword, setMqttPassword] = useState("");
  const [savedData, setSavedData] = useState(null);

  const handleSubmit = async () => {
    // Save data securely
    const data = {
      wifiSSID,
      wifiPassword,
      mqttServer,
      mqttPort,
      mqttUser,
      mqttPassword,
    };

    // Save to SecureStore
    await SecureStore.setItemAsync("config", JSON.stringify(data));

    // Update savedData state to display the values
    setSavedData(data);
  };

  const handleDelete = () => {
    // Show confirmation dialog
    Alert.alert(
      "Delete Configuration",
      "Are you sure you want to delete this configuration?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // Delete the saved data
            await SecureStore.deleteItemAsync("config");

            // Clear the savedData state
            setSavedData(null);
          },
        },
      ]
    );
  };

  const maskPassword = (password) => {
    return password ? "*".repeat(password.length) : "";
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>BeeGreen</Text>

      {/* Form (Hidden if savedData exists) */}
      {!savedData && (
        <View style={styles.formContainer}>
          {/* WiFi SSID */}
          <TextInput
            placeholder="WiFi SSID"
            value={wifiSSID}
            onChangeText={(text) => setWifiSSID(text)}
            keyboardType="default"
            style={styles.input}
          />
          {/* WiFi Password */}
          <TextInput
            placeholder="WiFi Password"
            value={wifiPassword}
            onChangeText={(text) => setWifiPassword(text)}
            secureTextEntry
            style={styles.input}
          />
          {/* MQTT Server */}
          <TextInput
            placeholder="MQTT Server"
            value={mqttServer}
            onChangeText={(text) => setMqttServer(text)}
            keyboardType="default"
            style={styles.input}
          />
          {/* MQTT Port */}
          <TextInput
            placeholder="MQTT Port"
            value={mqttPort}
            onChangeText={(text) => setMqttPort(text)}
            keyboardType="numeric"
            style={styles.input}
          />
          {/* MQTT Username */}
          <TextInput
            placeholder="MQTT Username"
            value={mqttUser}
            onChangeText={(text) => setMqttUser(text)}
            keyboardType="default"
            style={styles.input}
          />
          {/* MQTT Password */}
          <TextInput
            placeholder="MQTT Password"
            value={mqttPassword}
            onChangeText={(text) => setMqttPassword(text)}
            secureTextEntry
            style={styles.input}
          />

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <Button title="Submit" onPress={handleSubmit} />
          </View>
        </View>
      )}

      {/* Display Saved Data */}
      {savedData && (
        <View style={styles.savedDataContainer}>
          {/* Delete Button (Dustbin Icon) */}
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <MaterialIcons name="delete" size={24} color="red" />
          </TouchableOpacity>

          {/* Saved Data */}
          <Text style={styles.savedDataText}>
            <Text style={styles.label}>WiFi SSID:</Text> {savedData.wifiSSID}
          </Text>
          <Text style={styles.savedDataText}>
            <Text style={styles.label}>MQTT Server:</Text> {savedData.mqttServer}
          </Text>
          <Text style={styles.savedDataText}>
            <Text style={styles.label}>MQTT Port:</Text> {savedData.mqttPort}
          </Text>
          <Text style={styles.savedDataText}>
            <Text style={styles.label}>MQTT Username:</Text> {savedData.mqttUser}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#228B22",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 40,
    color: "#fff",
    marginBottom: 20,
    fontWeight: "bold",
  },
  formContainer: {
    width: "80%",
  },
  input: {
    backgroundColor: "#fff",
    padding: 10,
    width: "100%",
    marginTop: 15,
    color: "#000",
  },
  buttonContainer: {
    marginTop: 20,
    width: "100%",
  },
  savedDataContainer: {
    marginTop: 30,
    width: "80%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 5,
    position: "relative", // For positioning the delete button
  },
  savedDataText: {
    fontSize: 16,
    marginBottom: 10,
    color: "#000",
  },
  label: {
    fontWeight: "bold",
  },
  deleteButton: {
    position: "absolute", // Position absolutely within the card
    top: 10, // 10px from the top
    right: 10, // 10px from the right
  },
});