import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, SafeAreaView, Button } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Checkbox from "expo-checkbox";
import Paho from "paho-mqtt";
import * as SecureStore from "expo-secure-store";
import DefaultPage from "./DefaultPage"; // Import DefaultPage

const ControlPage = ({ navigation }) => {
  const [deviceAdded, setDeviceAdded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [schedulerSet, setSchedulerSet] = useState(false);
  const [pumpStatus, setPumpStatus] = useState("off");
  const [runForInterval, setRunForInterval] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [client, setClient] = useState(null);
  const pumpTriggerTopic = "beegreen/pump_trigger";
 // const [timeout, setTimeout] = useState("5000");
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchSavedData = async () => {
      const config = await SecureStore.getItemAsync("config");
      if (config) {
        const parsedConfig = JSON.parse(config);
        setDeviceAdded(parsedConfig.deviceAdded || false);
        setSchedulerSet(parsedConfig.schedulerSet || false);

        if (parsedConfig.mqttServer) {
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
           setIsOnline(true);
        },
        onFailure: (err) => {
          console.error("Failed to connect to MQTT broker", err);
          setIsOnline(false);
        },
            useSSL: true,
            userName: parsedConfig.mqttUser,
            password: parsedConfig.mqttPassword,
          });

          setClient(mqttClient);
        }
      }
	  if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    };

    fetchSavedData();
  }, []);
 
  const handleStartStop = () => {
    const newState = !isRunning;
	
	 if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
    setIsRunning(newState);
	setPumpStatus(newState ? "ON" : "OFF");	

    // Publish message to MQTT topic
    if (client && client.isConnected()) {
      const message = new Paho.Message(newState ? "1" : "0");
      message.destinationName = pumpTriggerTopic;
      client.send(message);
      console.log(`Published: ${newState ? "Start" : "Stop"}`);
	 // setPumpStatus(newState ? "ON" : "OFF");
	  if (newState && runForInterval) {
		
      timerRef.current = setTimeout(() => {
        setIsRunning(false);
        setPumpStatus("OFF");
		console.log("State is ON, run for interval is selected.");
        const stopMessage = new Paho.Message("0");
        stopMessage.destinationName = pumpTriggerTopic;
        client.send(stopMessage);
        console.log("Automatically stopped after 5 seconds");
      }, 5000); // 5 seconds
    }
    } else {
      console.error("MQTT client is not connected...");
    }
  };

 // if (!deviceAdded) {
 //   return <DefaultPage navigation={navigation} />; // Show default page if device is not added
 // }

  return (
    <SafeAreaView style={styles.container}>
	<Text style={styles.header}>{isOnline ? "BeeGreen is ready" : "Wait until device status is online"}</Text>
      {/* Online/Offline Indicator */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Device Status: {isOnline ? "Online" : "Offline"}
        </Text>
        
      </View>
      <Text style={styles.title}>Pump Status: {pumpStatus}</Text>
      
	   <Button
        title={isRunning ? "Stop" : "Start"}
        onPress={handleStartStop}
        color={isRunning ? "red" : "green"}
		
       />
	   
      <View style={styles.checkboxContainer}>
        <Checkbox
          value={runForInterval}
          onValueChange={setRunForInterval}
        />
        <Text style={styles.checkboxLabel}>Run for 5 seconds interval</Text>
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
  statusText: {
    fontSize: 20,
    color: "ffff",
  },
  statusLight: {
    width: 40,
    height: 40,
    borderRadius: 40,
    marginTop: 10,
  },
  statusContainer: {
    marginTop: -10,
    alignItems: "center",
  },
  header: {
    fontSize: 15,
    color: "green",
    marginBottom: 20,
    fontWeight: "bold",
  },
});

export default ControlPage;