import React, { useState, useEffect } from "react";
import {
  View,
  Button,
  StyleSheet,
  SafeAreaView,
  Text,
  Alert,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import Paho from "paho-mqtt";
import { Picker } from "@react-native-picker/picker";

const ControlPage = ({ navigation }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTime, setSelectedTime] = useState("00:00"); // For Set Timer
  const [selectedMinutes, setSelectedMinutes] = useState(0); // For Duration (Minutes)
  const [selectedSeconds, setSelectedSeconds] = useState(0); // For Duration (Seconds)
  const [intervalHours, setIntervalHours] = useState(0); // For Duration (Minutes)
  const [intervalMinutes, setIntervalMinutes] = useState(0); 
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

  // Generate time options in 24-hour format
  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        times.push(time);
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();
    
  
  // Generate hour options (0-99)
    const generateHourOptions = () => {
      const hours = [];
      for (let i = 0; i < 100; i++) {
        hours.push(i);
      }
      return hours;
    };

  // Generate minute options (0-99)
  const generateMinuteOptions = () => {
    const minutes = [];
    for (let i = 0; i < 100; i++) {
      minutes.push(i);
    }
    return minutes;
  };

  // Generate second options (0-59)
  const generateSecondOptions = () => {
    const seconds = [];
    for (let i = 0; i < 60; i++) {
      seconds.push(i);
    }
    return seconds;
  };

  const minuteOptions = generateMinuteOptions();
  const secondOptions = generateSecondOptions();
  const hourOptions = generateHourOptions();

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
    Alert.alert("Timer Set", `Timer set to ${selectedTime}`);
  };

  const handleSetDuration = () => {
    const duration = `${String(selectedMinutes).padStart(2, "0")}:${String(selectedSeconds).padStart(2, "0")}`;
    Alert.alert("Duration Set", `Duration set to ${duration}`);
  };

  const handleSetInterval = (value) => {
    setInterval(value);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>BeeGreen</Text>
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

      {/* Set Timer */}
      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Set Timer:</Text>
        <Picker
          selectedValue={selectedTime}
          onValueChange={(itemValue) => setSelectedTime(itemValue)}
          style={styles.picker}
        >
          {timeOptions.map((time, index) => (
            <Picker.Item key={index} label={time} value={time} />
          ))}
        </Picker>
      </View>

      {/* Duration */}
      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Duration:</Text>
        <View style={styles.durationPickerContainer}>
          <Picker
            selectedValue={selectedMinutes}
            onValueChange={(itemValue) => setSelectedMinutes(itemValue)}
            style={styles.durationPicker}
          >
            {minuteOptions.map((minute, index) => (
              <Picker.Item key={index} label={`${minute} min`} value={minute} />
            ))}
          </Picker>
          <Picker
            selectedValue={selectedSeconds}
            onValueChange={(itemValue) => setSelectedSeconds(itemValue)}
            style={styles.durationPicker}
          >
            {secondOptions.map((second, index) => (
              <Picker.Item key={index} label={`${second} sec`} value={second} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Interval */}
      <View style={styles.pickerContainer}>
      <Text style={styles.label}>Interval:</Text>
        <View style={styles.durationPickerContainer}>
          <Picker
            selectedValue={intervalHours}
            onValueChange={(itemValue) => setIntervalHours(itemValue)}
            style={styles.durationPicker}
          >
            {hourOptions.map((hour, index) => (
              <Picker.Item key={index} label={`${hour} hr`} value={hour} />
            ))}
          </Picker>
          <Picker
            selectedValue={intervalMinutes}
            onValueChange={(itemValue) => setIntervalMinutes(itemValue)}
            style={styles.durationPicker}
          >
            {minuteOptions.map((minute, index) => (
              <Picker.Item key={index} label={`${minute} min`} value={minute} />
            ))}
          </Picker>
        </View>
        <Button title="Set Schedule" onPress={handleSetDuration} />
      </View>

      {/* Start/Stop Button */}
      <Button
        title={isRunning ? "Stop" : "Start"}
        onPress={handleStartStop}
        color={isRunning ? "red" : "green"}
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
  },
  header: {
    fontSize: 40,
    color: "#fff",
    marginBottom: 20,
    fontWeight: "bold",
  },
  pickerContainer: {
    width: "80%",
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: "#fff",
    marginBottom: 10,
  },
  picker: {
    backgroundColor: "#fff",
    width: "100%",
  },
  durationPickerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  durationPicker: {
    backgroundColor: "#fff",
    width: "48%",
  },
  intervalContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
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