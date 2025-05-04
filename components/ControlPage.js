import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, SafeAreaView, Button, TouchableOpacity } from "react-native";
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
        <View style={styles.content}>
            {/* Header */}
            <Text style={styles.header}>
                {deviceAdded ? "BeeGreen is ready" : "Wait until device status is online"}
            </Text>
            
            {/* Status Card */}
            <View style={[styles.card, deviceAdded ? styles.onlineCard : styles.offlineCard]}>
                <Text style={styles.statusText}>
                    Device Status: {deviceAdded ? "Online" : "Offline"}
                </Text>
                {deviceAdded && (
                    <View style={styles.statusIndicator}>
                        <View style={[styles.statusLight, deviceAdded && styles.onlineLight]} />
                    </View>
                )}
            </View>
            
            {/* Pump Status */}
            <View style={styles.card}>
                <Text style={styles.title}>Pump Status:</Text>
                <Text style={[styles.pumpStatus, isRunning && styles.pumpActive]}>
                    {pumpStatus}
                </Text>
            </View>
            
            {/* Controls */}
            {deviceAdded && (
                <View style={styles.controlsContainer}>
                    <TouchableOpacity 
                        style={[styles.button, isRunning ? styles.stopButton : styles.startButton]}
                        onPress={handleStartStop}
                    >
                        <Text style={styles.buttonText}>
                            {isRunning ? "STOP" : "START"}
                        </Text>
                    </TouchableOpacity>
                    
                    <View style={styles.checkboxContainer}>
                        <Checkbox
                            value={runForInterval}
                            onValueChange={setRunForInterval}
                            color={runForInterval ? '#4CAF50' : undefined}
                        />
                        <Text style={styles.checkboxLabel}>Run for 5 seconds interval</Text>
                    </View>
                </View>
            )}
        </View>
    </SafeAreaView>
);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F5F5F5",
    },
    content: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    onlineCard: {
        borderLeftWidth: 5,
        borderLeftColor: '#4CAF50',
    },
    offlineCard: {
        borderLeftWidth: 5,
        borderLeftColor: '#F44336',
    },
    header: {
        fontSize: 22,
        color: '#333',
        marginBottom: 30,
        fontWeight: '600',
        textAlign: 'center',
    },
    title: {
        fontSize: 18,
        color: '#555',
        marginBottom: 5,
        fontWeight: '500',
    },
    statusText: {
        fontSize: 18,
        color: '#333',
        fontWeight: '500',
    },
    pumpStatus: {
        fontSize: 24,
        color: '#F44336',
        fontWeight: 'bold',
    },
    pumpActive: {
        color: '#4CAF50',
    },
    statusIndicator: {
        alignItems: 'center',
        marginTop: 10,
    },
    statusLight: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#F44336',
    },
    onlineLight: {
        backgroundColor: '#4CAF50',
    },
    controlsContainer: {
        marginTop: 10,
    },
    button: {
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    startButton: {
        backgroundColor: '#4CAF50',
    },
    stopButton: {
        backgroundColor: '#F44336',
    },
    buttonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: 'white',
        borderRadius: 8,
    },
    checkboxLabel: {
        fontSize: 16,
        marginLeft: 12,
        color: '#333',
    },
});

export default ControlPage;