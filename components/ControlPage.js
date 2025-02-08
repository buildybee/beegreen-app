import React, { useState, useEffect } from "react";
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

const ControlPage = ({ navigation }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [duration, setDuration] = useState("");
  const [interval, setInterval] = useState("24hr");
  const [isOnline, setIsOnline] = useState(false);
  const [savedData, setSavedData] = useState({
    wifiSSID: "",
    mqttServer: "",
    mqttPort: "",
    mqttUser: "",
    mqttPassword: "",
  });
  const [client, setClient] = useState(null);

  // MQTT Configuration
  const mqttPort = 8884; // WebSocket port (default for HiveMQ)
  const pumpTriggerTopic = "beegreen/pump";

  useEffect(() => {
    const fetchSavedData = async () => {
      const config = await SecureStore.getItemAsync("config");
      if (config) {
        const parsedConfig = JSON.parse(config);
        // Set default values if any field is missing
        setSavedData({
          wifiSSID: parsedConfig.wifiSSID || "",
          mqttServer: parsedConfig.mqttServer || "",
          mqttPort: parsedConfig.mqttPort || "",
          mqttUser: parsedConfig.mqttUser || "",
          mqttPassword: parsedConfig.mqttPassword || "",
        });
      }
    };

    fetchSavedData();
  }, []);

  useEffect(() => {
    if (savedData.mqttServer) {
      // Initialize MQTT client only if mqttServer is available
      const mqttClient = new Paho.Client(
        savedData.mqttServer,
        mqttPort,
        "clientId-" + Math.random().toString(16).substr(2, 8)
      );

      // Set callback handlers
      mqttClient.onConnectionLost = onConnectionLost;
      mqttClient.onMessageArrived = onMessageArrived;

      // Connect to the MQTT broker
      mqttClient.connect({
        onSuccess: () => {
          console.log("Connected to MQTT broker");
          setIsOnline(true);
        },
        onFailure: (err) => {
          console.error("Failed to connect to MQTT broker", err);
          setIsOnline(false);
        },
        useSSL: true,
        userName: savedData.mqttUser,
        password: savedData.mqttPassword,
      });

      setClient(mqttClient);

      // Cleanup on unmount
      return () => {
        if (mqttClient.isConnected()) {
          mqttClient.disconnect();
        }
      };
    }
  }, [savedData]);

  const onConnectionLost = (responseObject) => {
    if (responseObject.errorCode !== 0) {
      console.error("Connection lost:", responseObject.errorMessage);
      setIsOnline(false);
    }
  };

  const onMessageArrived = (message) => {
    console.log("Message arrived:", message.payloadString);
    // Handle incoming messages if needed
  };

  const handleStartStop = () => {
    const newState = !isRunning;
    setIsRunning(newState);

    // Publish message to MQTT topic
    if (client && client.isConnected()) {
      const message = new Paho.Message(newState ? "1" : "0");
      message.destinationName = pumpTriggerTopic;
      client.send(message);
      console.log(`Published: ${newState ? "Start" : "Stop"}`);
    } else {
      console.error("MQTT client is not connected");
    }
  };

  const handleSetTimer = () => {
    Alert.alert("Timer Set", `Timer set to ${hours}:${minutes}`);
  };

  const handleSetDuration = () => {
    Alert.alert("Duration Set", `Duration set to ${duration}`);
  };

  const handleSetInterval = (value) => {
    setInterval(value);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>BeeGreen</Text>
      {/* Start/Stop Button */}
      <Button
        title={isRunning ? "Stop" : "Start"}
        onPress={handleStartStop}
        color={isRunning ? "red" : "green"}
      />

      {/* Set Timer */}
      <View style={styles.timerContainer}>
        <TextInput
          placeholder="HH"
          value={hours}
          onChangeText={setHours}
          keyboardType="numeric"
          style={styles.timerInput}
        />
        <Text style={styles.timerSeparator}>:</Text>
        <TextInput
          placeholder="MM"
          value={minutes}
          onChangeText={setMinutes}
          keyboardType="numeric"
          style={styles.timerInput}
        />
        <Button title="Set Timer" onPress={handleSetTimer} />
      </View>

      {/* Duration */}
      <View style={styles.durationContainer}>
        <TextInput
          placeholder="MM:SS"
          value={duration}
          onChangeText={setDuration}
          keyboardType="numeric"
          style={styles.durationInput}
        />
        <Button title="Set Duration" onPress={handleSetDuration} />
      </View>

      {/* Interval */}
      <View style={styles.intervalContainer}>
        <Button title="24hr" onPress={() => handleSetInterval("24hr")} />
        <Button title="12hr" onPress={() => handleSetInterval("12hr")} />
        <TextInput
          placeholder="Custom HH:MM"
          value={interval}
          onChangeText={setInterval}
          keyboardType="numeric"
          style={styles.intervalInput}
        />
      </View>

      {/* Online/Offline Indicator */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Device Status: {isOnline ? "Online" : "Offline"}
        </Text>
        <View
          style={[
            styles.statusLight,
            { backgroundColor: isOnline ? "green" : "red" },
          ]}
        />
      </View>
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
  savedDataContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 5,
    width: "80%",
    marginBottom: 20,
  },
  savedDataText: {
    fontSize: 16,
    marginBottom: 10,
    color: "#000",
  },
  label: {
    fontWeight: "bold",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  timerInput: {
    backgroundColor: "#fff",
    padding: 10,
    width: 50,
    marginRight: 10,
    color: "#000",
  },
  timerSeparator: {
    fontSize: 20,
    color: "#fff",
  },
  durationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  durationInput: {
    backgroundColor: "#fff",
    padding: 10,
    width: 100,
    marginRight: 10,
    color: "#000",
  },
  intervalContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  intervalInput: {
    backgroundColor: "#fff",
    padding: 10,
    width: 100,
    marginLeft: 10,
    color: "#000",
  },
  statusContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  statusText: {
    fontSize: 20,
    color: "#fff",
  },
  statusLight: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginTop: 10,
  },
});

export default ControlPage;