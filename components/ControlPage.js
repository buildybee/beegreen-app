import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, Button } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Checkbox from "expo-checkbox";
import Paho from "paho-mqtt";
import * as SecureStore from "expo-secure-store";
import DefaultPage from "./DefaultPage"; // Import DefaultPage

const ControlPage = ({ navigation }) => {
  const [deviceAdded, setDeviceAdded] = useState(false);
  const [schedulerSet, setSchedulerSet] = useState(false);
  const [pumpStatus, setPumpStatus] = useState("off");
  const [runForInterval, setRunForInterval] = useState(false);
  const [client, setClient] = useState(null);

  useEffect(() => {
    const fetchSavedData = async () => {
      const config = await SecureStore.getItemAsync("config");
      if (config) {
        const parsedConfig = JSON.parse(config);
        setDeviceAdded(parsedConfig.deviceAdded || false);
        setSchedulerSet(parsedConfig.schedulerSet || false);

        if (parsedConfig.deviceAdded) {
          // Initialize MQTT client
          const mqttClient = new Paho.Client(
            parsedConfig.mqttServer,
            Number(parsedConfig.mqttPort),
            "clientId-" + Math.random().toString(16).substr(2, 8)
          );

          mqttClient.onMessageArrived = (message) => {
            if (message.destinationName === "beegreen/status") {
              setPumpStatus(message.payloadString);
			  console.log(message);
            }
          };

          mqttClient.connect({
            onSuccess: () => {
              mqttClient.subscribe("#");
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

  const handleStart = () => {
    if (client && client.isConnected()) {
      const message = new Paho.Message("1");
      message.destinationName = "beegreen/pump_trigger";
      client.send(message);
    }
  };

  const handleStop = () => {
    if (client && client.isConnected()) {
      const message = new Paho.Message("0");
      message.destinationName = "beegreen/pump_trigger";
      client.send(message);
    }
  };

  if (!deviceAdded) {
    return <DefaultPage navigation={navigation} />; // Show default page if device is not added
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Pump Status: {pumpStatus}</Text>
      <Button title="Start" onPress={handleStart} />
      <Button title="Stop" onPress={handleStop} />
      <View style={styles.checkboxContainer}>
        <Checkbox
          value={runForInterval}
          onValueChange={setRunForInterval}
        />
        <Text style={styles.checkboxLabel}>Run for predefined interval</Text>
      </View>
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  checkboxLabel: {
    fontSize: 16,
    marginLeft: 10,
  },
});

export default ControlPage;