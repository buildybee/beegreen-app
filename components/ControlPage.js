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
  const [pumpStatus, setPumpStatus] = useState("OFF");
  const [runForInterval, setRunForInterval] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [client, setClient] = useState(null);
  const pumpTriggerTopic = "beegreen/pump_trigger";
 // const [timeout, setTimeout] = useState("5000");
  const timerRef = useRef(null);
  const [savedData, setSavedData] = useState({
        pumpStatus: "OFF",
		pumpTime: "",
		mqttServer: "",
		mqttPort: "",
		mqttUser: "",
		mqttPassword: "",
		scheduler: "",
  });
 // const mqttClient= "";

const [dummy, setDummy] = useState(0);

useEffect(() => {
    const fetchSavedData = async () => {
      const config = await SecureStore.getItemAsync("config");
      if (config) {
        const parsedConfig = JSON.parse(config);
        // Set default values if any field is missing
        setSavedData({
          mqttServer: parsedConfig.mqttServer || "",
          mqttPort: parsedConfig.mqttPort || "",
          mqttUser: parsedConfig.mqttUser || "",
          mqttPassword: parsedConfig.mqttPassword || "",
		  pumpTime: parsedConfig.pumpTime || "",
		  scheduler: parsedConfig.scheduler || "",
		  pumpStatus: parsedConfig.pumpStatus || "",
        });
      }
    };

    fetchSavedData();
  }, []);

  useEffect(() => {
  
  
    const fetchSavedData = async () => {
      const config = await SecureStore.getItemAsync("config");
      if (config) { 
        const parsedConfig = JSON.parse(config);

        if (parsedConfig.mqttServer) {
          // Initialize MQTT client
         const mqttClient = new Paho.Client(
            parsedConfig.mqttServer,
            Number(parsedConfig.mqttPort),
            "clientId-" + Math.random().toString(16).substr(2, 8)
          );

          mqttClient.onMessageArrived = (message) => {
            if (message.destinationName === "beegreen/heartbeat" || message.destinationName === "beegreen/pump_status") {
              //setPumpStatus(message.payloadString);
			  if(message.payloadString){
			    console.log(message);
			    setDeviceAdded(true);
			  }
            }
			else{
				setDeviceAdded(false);
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
    };

    fetchSavedData();
  }, []);
 
  const handleStartStop = () => {
	const newState = !isRunning;	
    setIsRunning(newState);
	setPumpStatus(newState ? "ON" : "OFF");	
	
	//setPumpStatus(newState ? "ON" : "OFF");	

    // Publish message to MQTT topic
    if (client && client.isConnected()) {
	  //const newState = !isRunning;
	  //setIsRunning(newState);
      const message = new Paho.Message(newState ? "1" : "0");
      message.destinationName = pumpTriggerTopic;
      client.send(message);	  
	  if(deviceAdded){
		savedData.pumpTime = message.payloadString;
		setPumpStatus(newState ? "ON" : "OFF");
		savedData.pumpStatus = pumpStatus; 
	  }
	  else{
		//setDeviceAdded(false);
		setIsRunning(!newState);
		//newState = isRunning;
	  }
	  
      console.log(`Published: ${newState ? "Start" : "Stop"}`);
	 // setPumpStatus(newState ? "ON" : "OFF");
	  if (newState && runForInterval) {	
        timerRef.current = setTimeout(() => {
        
		console.log("State is ON, run for interval is selected.");
        const stopMessage = new Paho.Message("0");
        stopMessage.destinationName = pumpTriggerTopic;
        client.send(stopMessage);
        console.log("Automatically stopped after 5 seconds");
		
		if(deviceAdded){
			savedData.pumpTime = message.payloadString;
			setIsRunning(false);
			//newState = isRunning;
			setPumpStatus("OFF");
			savedData.pumpStatus = pumpStatus;
		}
		
		else{
			setIsRunning(!newState);
			//newState = isRunning;
		}
      }, 5000); // 5 seconds
     }
	 SecureStore.setItemAsync("config", JSON.stringify(savedData))
	  .then(() => {
		console.log(savedData); // Navigate to Control Page	
	 })
	 
    } else {
      console.error("Please refresh to update device status...");
    }
  };

 // if (!deviceAdded) {
 //   return <DefaultPage navigation={navigation} />; // Show default page if device is not added
 // }

  return (
    <SafeAreaView style={styles.container}>
	<Text style={styles.header}>{deviceAdded ? "BeeGreen is ready" : "Wait until device status is online"}</Text>
      {/* Online/Offline Indicator */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Device Status: {deviceAdded ? "Online" : "Offline"}
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
	fontWeight: "bold",
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