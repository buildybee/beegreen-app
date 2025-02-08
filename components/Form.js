import React, { useState, useEffect } from "react";
import { MaterialIcons } from "@expo/vector-icons"; // Import the icon library
import {
  View,
  TextInput,
  Button,
  StyleSheet,
  SafeAreaView,
  Text,
  TouchableOpacity,
} from "react-native";
import * as SecureStore from "expo-secure-store";

const Form = ({ navigation }) => {
  const [wifiSSID, setWifiSSID] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [mqttServer, setMqttServer] = useState("");
  const [mqttPort, setMqttPort] = useState("");
  const [mqttUser, setMqttUser] = useState("");
  const [mqttPassword, setMqttPassword] = useState("");
  const [savedData, setSavedData] = useState(null);

  useEffect(() => {
    const fetchSavedData = async () => {
      const config = await SecureStore.getItemAsync("config");
      if (config) {
        setSavedData(JSON.parse(config));
      }
    };

    fetchSavedData();
  }, []);

  const handleSubmit = async () => {
    const data = {
      wifiSSID,
      wifiPassword,
      mqttServer,
      mqttPort,
      mqttUser,
      mqttPassword,
    };

    await SecureStore.setItemAsync("config", JSON.stringify(data));
    navigation.replace("Control");
  };

  const handleDelete = async () => {
    // Delete the saved data
    await SecureStore.deleteItemAsync("config");

    // Clear the savedData state
    setSavedData(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>BeeGreen</Text>
       {/* Display Saved Data */}
       {savedData && (
        <View style={styles.savedDataContainer}>
          <TouchableOpacity style={styles.deleteButton} onPressIn={handleDelete}>
              <MaterialIcons name="delete" size={24} color="red" />
          </TouchableOpacity>
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

    {!savedData && (
      <View style={styles.formContainer}>
        <TextInput
          placeholder="WiFi SSID"
          value={wifiSSID}
          onChangeText={setWifiSSID}
          style={styles.input}
        />
        <TextInput
          placeholder="WiFi Password"
          value={wifiPassword}
          onChangeText={setWifiPassword}
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
        <TextInput
          placeholder="MQTT Username"
          value={mqttUser}
          onChangeText={setMqttUser}
          style={styles.input}
        />
        <TextInput
          placeholder="MQTT Password"
          value={mqttPassword}
          onChangeText={setMqttPassword}
          secureTextEntry
          style={styles.input}
        />
        <View style={styles.buttonContainer}>
          <Button title="Submit" onPress={handleSubmit} />
        </View>
      </View>)}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#228B22",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
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
  deleteButton: {
    position: "absolute",
    top: 10,
    right: 10,
},
});

export default Form;