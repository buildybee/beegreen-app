import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Paho from "paho-mqtt";
import * as SecureStore from "expo-secure-store";
import DefaultPage from "./DefaultPage"; // Import DefaultPage


const DevicePage =  ({ navigation }) => {
  const [firmwareVersion, setFirmwareVersion] = useState(null);
  const [isDeviceAdded, setIsDeviceAdded] = useState(false);
  const [client, setClient] = useState(null);
  const [deviceAdded, setDeviceAdded] = useState(false);


  useEffect(() => {
    const fetchSavedData = async () => {
      const config = await SecureStore.getItemAsync("config");
      if (config) {
        const parsedConfig = JSON.parse(config);
        setDeviceAdded(parsedConfig.deviceAdded || false);
        if (parsedConfig.deviceAdded) {
        // Initialize MQTT client
        const mqttClient = new Paho.Client(
          parsedConfig.mqttServer,
          Number(parsedConfig.mqttPort),
          "clientId-" + Math.random().toString(16).substr(2, 8)
        );

        mqttClient.onMessageArrived = (message) => {
          const data = JSON.parse(message.payloadString);
          setFirmwareVersion(data.firmwareVersion);
        };

        mqttClient.connect({
          onSuccess: () => {
            mqttClient.subscribe("/heartbeat");
          },
          useSSL: true,
          userName: parsedConfig.mqttUser,
          password: parsedConfig.mqttPassword,
        });

        setClient(mqttClient);
      }
    }
    };

    fetchSavedData();
  }, []);

  if (!deviceAdded) {
    return <DefaultPage navigation={navigation} />; // Show default page if device is not added
  }
  
  return (
    <SafeAreaView style={styles.container}>
      {isDeviceAdded ? (
        <View style={styles.content}>
          <Text style={styles.title}>Firmware Version:</Text>
          <Text style={styles.version}>{firmwareVersion || "Loading..."}</Text>
        </View>
      ) : (
        <View style={styles.placeholder}>
          <MaterialIcons name="add" size={100} color="#ccc" />
          <Text style={styles.placeholderText}>No device added</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  version: {
    fontSize: 20,
    color: "#666",
  },
  placeholder: {
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 18,
    color: "#ccc",
    marginTop: 10,
  },
});

export default DevicePage;