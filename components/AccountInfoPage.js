import React, { useState, useEffect } from "react";
import { View, StyleSheet, SafeAreaView, Text, TextInput, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import Paho from "paho-mqtt";

const handleLogin = () => {
    if (!mqttuser || !mqttpassword || !mqttServer || !mqttPort) {
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
      mqttUser: username,
      mqttPassword: password,
    });
  };

const AccountInfoPage = ({ navigation }) => {
  const [savedData, setSavedData] = useState(null);

  useEffect(() => {
    const fetchSavedData = async () => {
      const config = await SecureStore.getItemAsync("config");
      if (config) {
        const parsedConfig = JSON.parse(config);
        setSavedData(parsedConfig);
      }
    };

    fetchSavedData();
  }, []);

  const handleDelete = async () => {
    // Delete the saved data
    await SecureStore.deleteItemAsync("config");

    // Clear the savedData state
    setSavedData(null);
  };

const [mqttUser, setMqttUser] = useState('');
const [mqttServer, setMqttServer] = useState('');
const [mqttPort, setMqttPort] = useState('');
const [mqttPassword, setMqttPassword] = useState('');

const handleLogin = () => {
    if (!mqttUser || !mqttPassword || !mqttServer || !mqttPort) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
  
  //  setIsConnecting(true);
  
    // Initialize MQTT client
    const mqttClient = new Paho.Client(
      mqttServer,
      Number(mqttPort),
      "clientId-" + Math.random().toString(16).substr(2, 8)
    );
  
    // Set callback handlers
    mqttClient.onConnectionLost = (responseObject) => {
      //setIsConnecting(false);
      if (responseObject.errorCode !== 0) {
       // Alert.alert("Error", "Connection lost: " + responseObject.errorMessage);
		console.log("Connection lost");
      }
    };
  
    // Connect to the MQTT broker
    mqttClient.connect({
      onSuccess: () => {
        console.log("Connected to MQTT broker");
       // setIsConnecting(false);
  
        // Save configuration to SecureStore
        
        SecureStore.setItemAsync("config", JSON.stringify(config))
          .then(() => {
           // Alert.alert("Success", "Configuration saved successfully.");
			console.log("Success", "Configuration saved successfully.");
            navigation.replace("Control"); // Navigate to Control Page
          })
          .catch((error) => {
            console.error("Error saving configuration:");
            //Alert.alert("Error", "Failed to save configuration.");
          });
      },
      onFailure: (err) => {
        //setIsConnecting(false);
       // Alert.alert("Error", "Failed to connect to MQTT broker: " + err.errorMessage);
	   console.error("Error saving configuration:");
      },
      //useSSL: true,
      //userName: username,
      //password: password,
    });
  };



  return (
    <SafeAreaView style={styles.container}>
      {savedData ? (
        <View style={styles.savedDataContainer}>
          <Text style={styles.savedDataText}>
            MQTT User: {savedData.mqttUser}
          </Text>
          <Text style={styles.savedDataText}>
            MQTT Server: {savedData.mqttServer}
          </Text>
          <Text style={styles.savedDataText}>
            MQTT Port: {savedData.mqttPort}
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <MaterialIcons name="delete" size={24} color="red" />
          </TouchableOpacity>
        </View>
      ) : (
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
    )}
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

export default AccountInfoPage;