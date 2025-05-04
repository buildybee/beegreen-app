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
		mqttServer: mqttServer,
		mqttPort: mqttPort,
		mqttUser: mqttUser,
		mqttPassword: mqttPassword,
		deviceAdded: false, // Set deviceAdded to true
        schedulerSet: false,
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
           Alert.alert("Success! Configuration saved. Kindly close this app and reopen");
		   return <ControlPage navigation={navigation} />; // Navigate to Control Page	
            
      },
      onFailure: (err) => {
        setIsConnecting(false);
        Alert.alert("Error! Failed to connect to MQTT broker: " + err.errorMessage);
      },
      useSSL: true,
    });
};
return (
  <SafeAreaView style={styles.container}>
    <View style={styles.signupContainer}>
      <Text style={styles.signupText}>BeeGreen</Text>
      <Text style={styles.subtitle}>Enter MQTT connection details</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Enter MQTT User"
        placeholderTextColor="#aaa"
        value={mqttUser}
        onChangeText={setMqttUser}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter MQTT Password"
        placeholderTextColor="#aaa"
        value={mqttPassword}
        onChangeText={setMqttPassword}
        secureTextEntry={true}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter MQTT Server"
        placeholderTextColor="#aaa"
        value={mqttServer}
        onChangeText={setMqttServer}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter MQTT Port"
        placeholderTextColor="#aaa"
        value={mqttPort}
        onChangeText={setMqttPort}
        keyboardType="numeric"
      />
      
      <TouchableOpacity 
        style={styles.signupButton} 
        onPress={handleLogin}
        activeOpacity={0.8}
      >
        <Text style={styles.signupButtonText}>Connect</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaView>
)};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2E8B57", // Slightly darker green for better contrast
    alignItems: "center",
    justifyContent: "center",
  },
  signupContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  signupText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 28,
    marginBottom: 5,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 25,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    color: 'white',
    fontSize: 16,
  },
  signupButton: {
    backgroundColor: '#1E6F9F',
    width: '100%',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  signupButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});

export default LoginPage;