import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  Alert,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch
} from "react-native";
import * as SecureStore from "expo-secure-store";
import Paho from "paho-mqtt";
import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';

const SchedulerPage = ({ navigation }) => {
  // Initialize all state properly
  const [savedData, setSavedData] = useState({
    pumpStatus: "OFF",
    pumpTime: "",
    mqttServer: "",
    mqttPort: "",
    mqttUser: "",
    mqttPassword: "",
    scheduler: "",
  });

  const [selectedDays, setSelectedDays] = useState({
    Sunday: false,
    Monday: false,
    Tuesday: false,
    Wednesday: false,
    Thursday: false,
    Friday: false,
    Saturday: false
  });

  const [scheduleIndex, setScheduleIndex] = useState(0);
  const [selectedHour, setSelectedHour] = useState(0);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [client, setClient] = useState(null);
  const [savedSchedules, setSavedSchedules] = useState([]);
  const offlineTimerRef = useRef(null);

  // MQTT Configuration
  const mqttPort = 8884;
  const setScheduleTopic = "beegreen/set_schedule";
  const getScheduleTopic = "beegreen/get_schedule";
  const pumpStatusTopic = "beegreen/pump_status";

  const calculateDaysBitmask = () => {
    let bitmask = 0;
    if (selectedDays.Sunday) bitmask |= 1;
    if (selectedDays.Monday) bitmask |= 2;
    if (selectedDays.Tuesday) bitmask |= 4;
    if (selectedDays.Wednesday) bitmask |= 8;
    if (selectedDays.Thursday) bitmask |= 16;
    if (selectedDays.Friday) bitmask |= 32;
    if (selectedDays.Saturday) bitmask |= 64;
    return bitmask;
  };

  useEffect(() => {
    const fetchSavedData = async () => {
      const config = await SecureStore.getItemAsync("config");
      if (config) {
        const parsedConfig = JSON.parse(config);
        setSavedData({
          pumpStatus: parsedConfig.pumpStatus || "OFF",
          pumpTime: parsedConfig.pumpTime || "",
          mqttServer: parsedConfig.mqttServer || "",
          mqttPort: parsedConfig.mqttPort || "",
          mqttUser: parsedConfig.mqttUser || "",
          mqttPassword: parsedConfig.mqttPassword || "",
          scheduler: parsedConfig.scheduler || "",
        });
      }
    };
    fetchSavedData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const initializeMqtt = () => {
        if (savedData.mqttServer) {
          const mqttClient = new Paho.Client(
            savedData.mqttServer,
            mqttPort,
            "clientId-" + Math.random().toString(16).substr(2, 8)
          );

		mqttClient.onMessageArrived = (message) => {
		  console.log("Message received:", message.destinationName, message.payloadString);
		  
		  // Device is online if we receive pump status messages
		  if (message.destinationName === pumpStatusTopic) {
			setIsOnline(true);
			if (offlineTimerRef.current) {
			  clearTimeout(offlineTimerRef.current);
			}
			offlineTimerRef.current = setTimeout(() => {
			  setIsOnline(false);
			}, 30000);
		  }
		  
		  if (message.destinationName === getScheduleTopic) {
			try {
			  let schedules;
			  // Try to parse as JSON first
			  try {
				schedules = JSON.parse(message.payloadString);
			  } catch (e) {
				// If not JSON, treat as raw string
				schedules = message.payloadString;
			  }
			  setSavedSchedules(schedules);
			} catch (error) {
			  console.error("Error handling schedules:", error);
			}
		  }
		};
          mqttClient.onConnectionLost = (response) => {
            console.log("Connection lost:", response.errorMessage);
            setIsOnline(false);
          };

          mqttClient.connect({
            onSuccess: () => {
              console.log("Connected to MQTT broker");
              mqttClient.subscribe(pumpStatusTopic);
              mqttClient.subscribe(getScheduleTopic);
              // Request current schedules
              const msg = new Paho.Message("request");
              msg.destinationName = getScheduleTopic;
              mqttClient.send(msg);
            },
            onFailure: (err) => {
              console.error("Connection failed", err);
              setIsOnline(false);
            },
            useSSL: true,
            userName: savedData.mqttUser,
            password: savedData.mqttPassword,
          });

          setClient(mqttClient);

          return () => {
            if (mqttClient.isConnected()) {
              mqttClient.disconnect();
            }
            if (offlineTimerRef.current) {
              clearTimeout(offlineTimerRef.current);
            }
          };
        }
      };

      initializeMqtt();
    }, [savedData.mqttServer, savedData.mqttUser, savedData.mqttPassword])
  );

  const handleSetSchedule = () => {
    const daysBitmask = calculateDaysBitmask();
    const payload = `${scheduleIndex}:${selectedHour}:${selectedMinute}:${duration}:${daysBitmask}:${isEnabled ? 1 : 0}`;
    
    if (client && client.isConnected()) {
      const message = new Paho.Message(payload);
      message.destinationName = setScheduleTopic;
      client.send(message);
      Alert.alert("Schedule Set", `Schedule #${scheduleIndex} configured`);
      
      // Request updated schedules
      const msg = new Paho.Message("request");
      msg.destinationName = getScheduleTopic;
      client.send(msg);
    } else {
      Alert.alert("Error", "Not connected to MQTT broker");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A4D68" />
      
      <View style={styles.header}>
        <MaterialCommunityIcons name="calendar-clock" size={32} color="#fff" />
        <Text style={styles.headerTitle}>Irrigation Scheduler</Text>
      </View>

      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Device Status:</Text>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#05FF00' : '#FF0000' }]} />
            <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Schedule Slot Selection */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="calendar-edit" size={24} color="#0A4D68" />
            <Text style={styles.cardTitle}>Schedule Slot</Text>
          </View>
          <Picker
            selectedValue={scheduleIndex}
            onValueChange={setScheduleIndex}
            style={styles.picker}
          >
            {[...Array(10).keys()].map(i => (
              <Picker.Item key={i} label={`Schedule #${i}`} value={i} />
            ))}
          </Picker>
        </View>

        {/* Time Selection */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="clock-outline" size={24} color="#0A4D68" />
            <Text style={styles.cardTitle}>Start Time</Text>
          </View>
          <View style={styles.timeContainer}>
            <View style={styles.timePicker}>
              <Text style={styles.timeLabel}>Hour</Text>
              <Slider
                minimumValue={0}
                maximumValue={23}
                step={1}
                value={selectedHour}
                onValueChange={setSelectedHour}
                minimumTrackTintColor="#0A4D68"
                maximumTrackTintColor="#E2E8F0"
                thumbTintColor="#0A4D68"
              />
              <Text style={styles.timeValue}>{selectedHour}:{selectedMinute.toString().padStart(2, '0')}</Text>
            </View>
            <View style={styles.timePicker}>
              <Text style={styles.timeLabel}>Minute</Text>
              <Slider
                minimumValue={0}
                maximumValue={59}
                step={1}
                value={selectedMinute}
                onValueChange={setSelectedMinute}
                minimumTrackTintColor="#0A4D68"
                maximumTrackTintColor="#E2E8F0"
                thumbTintColor="#0A4D68"
              />
            </View>
          </View>
        </View>

        {/* Duration Selection */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="timer-outline" size={24} color="#0A4D68" />
            <Text style={styles.cardTitle}>Duration</Text>
          </View>
          <View style={styles.durationContainer}>
            <Text style={styles.durationLabel}>{duration} seconds</Text>
            <Slider
              minimumValue={0}
              maximumValue={3600}
              step={1}
              value={duration}
              onValueChange={setDuration}
              minimumTrackTintColor="#0A4D68"
              maximumTrackTintColor="#E2E8F0"
              thumbTintColor="#0A4D68"
            />
          </View>
        </View>

        {/* Days of Week Selection */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="calendar-week" size={24} color="#0A4D68" />
            <Text style={styles.cardTitle}>Repeat Days</Text>
          </View>
          {Object.keys(selectedDays).map(day => (
            <View key={day} style={styles.dayRow}>
              <Text style={styles.dayLabel}>{day}</Text>
              <Switch
                value={selectedDays[day]}
                onValueChange={(value) => setSelectedDays({...selectedDays, [day]: value})}
                trackColor={{ false: "#E2E8F0", true: "#0A4D68" }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>

        {/* Enable/Disable */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="power" size={24} color="#0A4D68" />
            <Text style={styles.cardTitle}>Status</Text>
          </View>
          <View style={styles.enableRow}>
            <Text style={styles.enableLabel}>{isEnabled ? 'Enabled' : 'Disabled'}</Text>
            <Switch
              value={isEnabled}
              onValueChange={setIsEnabled}
              trackColor={{ false: "#E2E8F0", true: "#0A4D68" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Set Schedule Button - Now visible at the bottom */}
        <TouchableOpacity 
          style={[styles.setButton, { opacity: isOnline ? 1 : 0.5 }]} 
          onPress={handleSetSchedule}
          disabled={!isOnline}
        >
          <Text style={styles.setButtonText}>SET SCHEDULE</Text>
        </TouchableOpacity>

        {/* Display saved schedules */}
        {savedSchedules && (
        <View style={styles.schedulesCard}>
          <Text style={styles.schedulesTitle}>Active Schedules</Text>
          {Array.isArray(savedSchedules) ? (
            savedSchedules.map((sched, index) => (
              <Text key={index} style={styles.scheduleItem}>
                #{index}: {JSON.stringify(sched)}
              </Text>
            ))
          ) : (
            <Text style={styles.scheduleItem}>{savedSchedules}</Text>
          )}
        </View>
      )}
      </ScrollView>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#0A4D68',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 10,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 16,
    color: '#4A5568',
    fontWeight: '500',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#2D3748',
    fontWeight: '600',
  },
  content: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A4D68',
    marginLeft: 10,
  },
  picker: {
    backgroundColor: '#F5F7F8',
    borderRadius: 8,
    marginTop: 10,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timePicker: {
    width: '48%',
  },
  timeLabel: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 8,
  },
  timeValue: {
    fontSize: 16,
    color: '#0A4D68',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  durationContainer: {
    paddingHorizontal: 8,
  },
  durationLabel: {
    fontSize: 16,
    color: '#0A4D68',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dayLabel: {
    fontSize: 16,
    color: '#4A5568',
  },
  enableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  enableLabel: {
    fontSize: 16,
    color: '#4A5568',
  },
  setButton: {
    backgroundColor: '#0A4D68',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 16,
  },
  setButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  schedulesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  schedulesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A4D68',
    marginBottom: 12,
  },
  scheduleItem: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 8,
  },
});

export default SchedulerPage;