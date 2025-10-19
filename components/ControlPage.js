import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, StatusBar } from "react-native";
import Slider from '@react-native-community/slider';
import { MaterialIcons } from "@expo/vector-icons";
import Checkbox from "expo-checkbox";
import Paho from "paho-mqtt";
import * as SecureStore from "expo-secure-store";

const ControlPage = ({ navigation }) => {
  const [deviceAdded, setDeviceAdded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [pumpStatus, setPumpStatus] = useState("off");
  const [duration, setDuration] = useState(5); // Default duration in seconds
  const [isOnline, setIsOnline] = useState(false);
  const [client, setClient] = useState(null);
  const pumpTriggerTopic = "beegreen/pump_trigger";
  const pumpStatusTopic = "beegreen/pump_status";
  const heartbeat = "beegreen/heartbeat";
  const timerRef = useRef(null);
  const lastMessageTimeRef = useRef(null);
  const connectionCheckIntervalRef = useRef(null);

  useEffect(() => {
    const fetchSavedData = async () => {
      const config = await SecureStore.getItemAsync("config");
      if (config) {
        const parsedConfig = JSON.parse(config);
        setDeviceAdded(parsedConfig.deviceAdded || false);

        if (parsedConfig.mqttServer) {
          const mqttClient = new Paho.Client(
            parsedConfig.mqttServer,
            Number(parsedConfig.mqttPort),
            "clientId-" + Math.random().toString(16).substr(2, 8)
          );

          mqttClient.onMessageArrived = (message) => {
            if (message.destinationName === pumpStatusTopic) {
              try {
                const payload = JSON.parse(message.payloadString);
                const status = payload.payload.toLowerCase();
                setPumpStatus(status);
                setIsRunning(status === "on");
                setDeviceAdded(true);
                setIsOnline(true); // Set online when receiving pump status
                lastMessageTimeRef.current = Date.now();
                
                if (status === "off" && timerRef.current) {
                  clearTimeout(timerRef.current);
                }
              } catch (error) {
                console.error("Error parsing message:", error);
              }
            }
          };

          mqttClient.connect({
            onSuccess: () => {
              mqttClient.subscribe(pumpStatusTopic);
			  mqttClient.subscribe(heartbeat);
			  setIsOnline(true);
              // Start checking for message freshness
              connectionCheckIntervalRef.current = setInterval(() => {
                if (lastMessageTimeRef.current && 
                    Date.now() - lastMessageTimeRef.current > 1200000) { // 2 mins without messages
                  setIsOnline(false);
                }
              }, 5000); // Check every 5 seconds
            },
            onFailure: (err) => {
              console.error("Connection failed", err);
              setIsOnline(false);
            },
            useSSL: true,
            userName: parsedConfig.mqttUser,
            password: parsedConfig.mqttPassword,
          });

          mqttClient.onConnectionLost = (responseObject) => {
            if (responseObject.errorCode !== 0) {
              console.log("Connection lost:", responseObject.errorMessage);
              setIsOnline(false);
            }
          };

          setClient(mqttClient);
        }
      }
    };

    fetchSavedData();

    return () => {
     // if (client) client.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
      }
    };
  }, []);

  const handlePumpControl = (start) => {
	
    if (client && client.isConnected()) {
	  setIsOnline(true);
      const message = new Paho.Message(start ? duration.toString() : "0");
      message.destinationName = pumpTriggerTopic;
	  message.qos = 1;
      client.send(message);
	  lastMessageTimeRef.current = Date.now();
      
      if (start) {
        // Set a timeout as a fallback in case we don't receive status updates
        timerRef.current = setTimeout(() => {
          setIsRunning(false);
          setPumpStatus("off");
        }, duration * 1000);
      } else if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BeeGreen Controller</Text>
        <View style={[styles.statusIndicator, { backgroundColor: isOnline ? '#4CAF50' : '#F44336' }]}>
          <Text style={styles.statusText}>{isOnline ? "ONLINE" : "OFFLINE"}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="opacity" size={24} color="#5E72E4" />
          <Text style={styles.cardTitle}>Pump Controller</Text>
        </View>
        
        <View style={styles.statusContainer}>
          <Text style={styles.statusLabel}>Current Status:</Text>
          <View style={[styles.statusBadge, { backgroundColor: pumpStatus === 'on' ? '#4CAF50' : '#F44336' }]}>
            <Text style={styles.statusBadgeText}>{pumpStatus.toUpperCase()}</Text>
          </View>
        </View>

        {!isRunning ? (
          <>
            <Text style={styles.durationLabel}>Duration: {duration} seconds</Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={60}
              step={1}
              value={duration}
              onValueChange={setDuration}
              minimumTrackTintColor="#5E72E4"
              maximumTrackTintColor="#E2E8F0"
              thumbTintColor="#5E72E4"
            />
            <TouchableOpacity 
              style={[styles.controlButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => handlePumpControl(true)}
            >
              <Text style={styles.controlButtonText}>START PUMP</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity 
            style={[styles.controlButton, { backgroundColor: '#F44336' }]}
            onPress={() => handlePumpControl(false)}
          >
            <Text style={styles.controlButtonText}>STOP PUMP</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>BeeGreen Irrigation System</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3748',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginLeft: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  statusLabel: {
    fontSize: 16,
    color: '#718096',
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  durationLabel: {
    fontSize: 16,
    color: '#4A5568',
    marginBottom: 10,
    textAlign: 'center',
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 25,
  },
  controlButton: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  controlButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: '#A0AEC0',
    fontSize: 12,
  },
});

export default ControlPage;