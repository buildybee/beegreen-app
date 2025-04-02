import React, { useState, useEffect } from "react";
import { View, StyleSheet, SafeAreaView, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import Paho from "paho-mqtt";
import ControlPage from "./ControlPage";


const LoginPage = ({ navigation }) => {
	const [mqttUser, setMqttUser] = useState('');
	const [isRunning, setIsRunning] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const [mqttServer, setMqttServer] = useState('');
	const [mqttPort, setMqttPort] = useState('');
	const [mqttPassword, setMqttPassword] = useState('');
	const [savedData, setSavedData] = useState({
		wifiSSID: "Airtel_deba_4193",
		mqttServer: mqttServer,
		mqttPort: mqttPort,
		mqttUser: mqttUser,
		mqttPassword: mqttPassword,
	 });

const handleLogin = () => {
	
	console.log("in handle login func of login page");
  
    if (!mqttUser || !mqttPassword || !mqttServer || !mqttPort) {
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
  console.log(mqttClient.isConnected);
    // Set callback handlers
    mqttClient.onConnectionLost = (responseObject) => {
      setIsConnecting(false);
      if (responseObject.errorCode !== 0) {
        Alert.alert("Error", "Connection lost: " + responseObject.errorMessage);
      }
    };
  console.log("now will try to connect mqtt");
    // Connect to the MQTT broker
    mqttClient.connect({
	  userName: mqttUser, // Replace with your username
      password: mqttPassword, // Replace with your password
	  useSSL: true, // Set to true for TLS/SSL
      onSuccess: () => {
        console.log("Connected to MQTT broker");
        setIsConnecting(false);
  
        // Save configuration to SecureStore
        const config = {
          mqttServer,
          mqttPort,
          mqttUser,
          mqttPassword,
          deviceAdded: false, // Set deviceAdded to true
          schedulerSet: false, // Default to false
        };
		console.log(config);
        SecureStore.setItemAsync("config", JSON.stringify(config))
          .then(() => {
            Alert.alert("Success", "Configuration saved successfully.");
            return <ControlPage navigation={navigation} />; // Navigate to Control Page	
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
    });
};
   return (
    <SafeAreaView style={styles.container}>
      
      <View style={styles.signupContainer}>
        <Text style={styles.signupText}>Sign Up</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter MQTT User"
          value={mqttUser}
          onChangeText={setMqttUser}
        />
		<TextInput
          style={styles.input}
          placeholder="Enter MQTT password"
          value={mqttPassword}
          onChangeText={setMqttPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter MQTT Server"
          value={mqttServer}
          onChangeText={setMqttServer}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter MQTT Port"
          value={mqttPort}
          onChangeText={setMqttPort}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.signupButton} onPress={handleLogin}>
          <Text style={styles.signupButtonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    
    </SafeAreaView>
)};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#228B22",
    alignItems: "center",
    justifyContent: "center",
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
  placeholderContainer: {
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
  },
  signupContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  input: {
    width: '80%',
    height: 40,
    borderWidth: 1,
    marginBottom: 10,
    padding: 10,
    borderRadius: 5,
  },
  signupButton: {
    backgroundColor: 'blue',
    padding: 10,
    borderRadius: 5,
  },
  signupButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default LoginPage;