import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Modal,
  TextInput,
  Alert
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import Paho from "paho-mqtt";
import * as SecureStore from "expo-secure-store";

const SchedulerPage = ({ navigation }) => {
  // State management
  const [schedules, setSchedules] = useState(Array(10).fill(null).map((_, index) => ({
    index,
    hour: 0,
    min: 0,
    dur: 0,
    dow: 0,
    en: 0
  })));
  const [isOnline, setIsOnline] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState({
    index: 0,
    hour: 8,
    min: 0,
    dur: 60,
    dow: 62,
    en: 1
  });
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");

  // MQTT Topics
  const topics = {
    setSchedule: "beegreen/set_schedule",
    requestSchedules: "beegreen/get_schedules",
    getSchedulesResponse: "beegreen/get_schedules_response",
    heartbeat: "beegreen/heartbeat"
  };

  // Days of week values for bitmask
  const daysValues = {
    Sunday: 1,
    Monday: 2,
    Tuesday: 4,
    Wednesday: 8,
    Thursday: 16,
    Friday: 32,
    Saturday: 64
  };

  // Initialize MQTT connection
  useEffect(() => {
    const initializeMqtt = async () => {
      const config = await SecureStore.getItemAsync("config");
      if (config) {
        const { mqttServer, mqttUser, mqttPassword } = JSON.parse(config);
        
        const mqttClient = new Paho.Client(
          mqttServer,
          8884,
          `clientId-${Math.random().toString(36).substr(2, 8)}`
        );

        mqttClient.onMessageArrived = (message) => {
          console.log(`📨 Message received on topic: ${message.destinationName}`);
          console.log("📦 Raw payload:", message.payloadString);
          
          if (message.destinationName === topics.getSchedulesResponse) {
            setDebugInfo(`Received: ${message.payloadString}`);
            
            try {
              const payloadStr = message.payloadString.trim();
              console.log("🔍 Processing payload:", payloadStr);
              
              // Try to parse the payload
              const parsedSchedules = parseSchedulesFromPayload(payloadStr);
              console.log("✅ Parsed schedules:", parsedSchedules);
              
              if (parsedSchedules.length > 0) {
                // Update schedules state - show ALL schedules from device
                const allSchedules = Array(10).fill(null).map((_, index) => {
                  const foundSchedule = parsedSchedules.find(s => s.index === index);
                  return foundSchedule || {
                    index,
                    hour: 0,
                    min: 0,
                    dur: 0,
                    dow: 0,
                    en: 0
                  };
                });
                
                setSchedules(allSchedules);
                
                // Save to SecureStore
                SecureStore.setItemAsync("schedules", JSON.stringify(allSchedules));
              }
            } catch (error) {
              console.error("❌ Error parsing schedules:", error);
              setDebugInfo(`Error: ${error.message}`);
            }
            
            setIsLoading(false);
          } else if (message.destinationName === topics.heartbeat) {
            console.log("💓 Heartbeat received");
            setIsOnline(true);
          }
        };

        mqttClient.onConnectionLost = (responseObject) => {
          console.log("🔌 Connection lost:", responseObject.errorMessage);
          setIsOnline(false);
        };

        mqttClient.connect({
          onSuccess: () => {
            console.log("✅ MQTT Connected successfully");
            setIsOnline(true);
            
            // Subscribe to topics
            mqttClient.subscribe(topics.getSchedulesResponse);
            mqttClient.subscribe(topics.heartbeat);
            console.log("📡 Subscribed to topics");
            
            // Request schedules after a short delay
            setTimeout(() => {
              if (mqttClient.isConnected()) {
                requestSchedules(mqttClient);
              }
            }, 1000);
          },
          onFailure: (err) => {
            console.error("❌ Connection failed:", err);
            Alert.alert("Connection Error", "Failed to connect to MQTT server");
            setIsOnline(false);
            setIsLoading(false);
          },
          useSSL: true,
          userName: mqttUser,
          password: mqttPassword,
          reconnect: true,
          keepAliveInterval: 30,
        });

        setClient(mqttClient);
      } else {
        console.log("⚠️ No MQTT configuration found");
        Alert.alert("Configuration Missing", "Please configure MQTT settings first");
        setIsLoading(false);
      }
    };

    initializeMqtt();

    return () => {
      if (client) {
        client.disconnect();
        console.log("🔌 MQTT client disconnected");
      }
    };
  }, []);

   // Parse schedules from payload string
  const parseSchedulesFromPayload = (payloadStr) => {
    const schedules = [];
    
    // Clean the payload
    const cleanPayload = payloadStr.trim();
    
    // Check if it's empty
    if (!cleanPayload) {
      console.log("Payload is empty");
      return schedules;
    }
    
    console.log("Parsing payload:", cleanPayload);
    
    // Try to parse as JSON array
    if (cleanPayload.startsWith('[') && cleanPayload.endsWith(']')) {
      try {
        const jsonArray = JSON.parse(cleanPayload);
        console.log("Parsed as JSON array:", jsonArray);
        
        jsonArray.forEach((item, index) => {
          if (typeof item === 'string') {
            // Item is a colon-separated string like "0:8:0:60:62"
            const parts = item.split(':').map(part => part.trim());
            console.log(`Item ${index} parts:`, parts);
            
            if (parts.length === 5) {
              // Format: index:hour:minute:duration:days (enabled is implied as 1)
              schedules.push({
                index: parseInt(parts[0]) || index,
                hour: parseInt(parts[1]) || 0,
                min: parseInt(parts[2]) || 0,
                dur: parseInt(parts[3]) || 0,
                dow: parseInt(parts[4]) || 0,
                en: true // All schedules from device are enabled
              });
            } else if (parts.length === 6) {
              // Format: index:hour:minute:duration:days:enabled
              schedules.push({
                index: parseInt(parts[0]) || index,
                hour: parseInt(parts[1]) || 0,
                min: parseInt(parts[2]) || 0,
                dur: parseInt(parts[3]) || 0,
                dow: parseInt(parts[4]) || 0,
                en: parts[5] === '1' || parts[5].toLowerCase() === 'true'
              });
            }
          } else if (item && typeof item === 'object') {
            // Item is already an object
            schedules.push({
              index: item.index !== undefined ? item.index : index,
              hour: item.hour || item.HOUR || item.h || 0,
              min: item.min || item.MIN || item.m || 0,
              dur: item.dur || item.DUR || item.d || item.duration || 0,
              dow: item.dow || item.DOW || item.w || item.daysofweek || 0,
              en: true // All schedules from device are enabled
            });
          }
        });
        return schedules;
      } catch (e) {
        console.log("Not valid JSON array:", e.message);
      }
    }
    
    console.log("Final parsed schedules:", schedules);
    return schedules;
  };
  
  // Load schedules from SecureStore on initial render
  useEffect(() => {
    const loadSchedules = async () => {
      try {
        const savedSchedules = await SecureStore.getItemAsync("schedules");
        if (savedSchedules) {
          const parsedSchedules = JSON.parse(savedSchedules);
          if (Array.isArray(parsedSchedules)) {
            setSchedules(parsedSchedules);
            console.log("Loaded schedules from cache");
          }
        }
      } catch (error) {
        console.error("Error loading schedules:", error);
      }
    };
    loadSchedules();
  }, []);

  const requestSchedules = (mqttClient) => {
    if (!mqttClient || !mqttClient.isConnected()) {
      Alert.alert("Offline", "Not connected to MQTT server");
      return;
    }
    
    console.log("📤 Requesting schedules from device...");
    setIsLoading(true);
    setDebugInfo("Requesting schedules...");
    
    try {
      const message = new Paho.Message("");
      message.destinationName = topics.requestSchedules;
      message.qos = 1;
      
      mqttClient.send(message);
      console.log("✅ Schedule request sent");
      
      // Timeout if no response
      setTimeout(() => {
        if (isLoading) {
          setIsLoading(false);
          setDebugInfo("No response received");
          Alert.alert("Timeout", "No response from device");
        }
      }, 5000);
    } catch (error) {
      console.error("Error sending request:", error);
      setIsLoading(false);
      setDebugInfo(`Error: ${error.message}`);
    }
  };

  const saveSchedule = () => {
    if (!client || !client.isConnected()) {
      Alert.alert("Error", "Not connected to device");
      return;
    }

    const { index, hour, min, dur, dow, en } = currentSchedule;
    const payload = `${index}:${hour}:${min}:${dur}:${dow}:${en ? 1 : 0}`;
    
    console.log("💾 Saving schedule:", payload);
    
    const message = new Paho.Message(payload);
    message.destinationName = topics.setSchedule;
    message.qos = 1;
    client.send(message);

    // Update local state
    const updatedSchedules = [...schedules];
    updatedSchedules[index] = { ...currentSchedule };
    setSchedules(updatedSchedules);

    // Save to SecureStore
    SecureStore.setItemAsync("schedules", JSON.stringify(updatedSchedules));

    setModalVisible(false);
    
    // Refresh schedules
    setTimeout(() => requestSchedules(client), 1000);
  };

  const deleteSchedule = (index) => {
    if (!client || !client.isConnected()) {
      Alert.alert("Error", "Not connected to device");
      return;
    }

    const payload = `${index}:0:0:0:0:0`;
    console.log("🗑️ Deleting schedule:", payload);

    const message = new Paho.Message(payload);
    message.destinationName = topics.setSchedule;
    message.qos = 1;
    client.send(message);

    // Update local state
    const updatedSchedules = [...schedules];
    updatedSchedules[index] = {
      index,
      hour: 0,
      min: 0,
      dur: 0,
      dow: 0,
      en: 0
    };
    setSchedules(updatedSchedules);

    // Save to SecureStore
    SecureStore.setItemAsync("schedules", JSON.stringify(updatedSchedules));
    
    // Refresh schedules
    setTimeout(() => requestSchedules(client), 1000);
  };

  const refreshSchedules = () => {
    if (!client || !client.isConnected()) {
      Alert.alert("Error", "Not connected to device");
      return;
    }
    
    requestSchedules(client);
  };

  const toggleDay = (day) => {
    const dayValue = daysValues[day];
    const newDow = currentSchedule.dow ^ dayValue;
    setCurrentSchedule({ ...currentSchedule, dow: newDow });
  };

  const isDaySelected = (day) => {
    return (currentSchedule.dow & daysValues[day]) !== 0;
  };

  const formatTime = (hour, min) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${min.toString().padStart(2, '0')} ${period}`;
  };

  const formatDays = (dow) => {
    if (dow === 0) return "Never";
    if (dow === 127) return "Every day";
    
    const selectedDays = [];
    Object.entries(daysValues).forEach(([day, value]) => {
      if (dow & value) {
        selectedDays.push(day.substring(0, 3));
      }
    });
    return selectedDays.join(", ");
  };

  // Get ALL schedules to display (not just enabled ones)
  // Since device only sends enabled schedules, we show all we receive
  const displaySchedules = schedules.filter(s => s.dur > 0 || s.hour > 0 || s.min > 0);
  const displaySchedulesCount = displaySchedules.length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Irrigation Scheduler</Text>
          <Text style={styles.scheduleCount}>
            {displaySchedulesCount} schedule{displaySchedulesCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            onPress={refreshSchedules}
            style={[styles.refreshButton, (isLoading || !isOnline) && styles.refreshButtonDisabled]}
            disabled={isLoading || !isOnline}
          >
            <MaterialIcons 
              name="refresh" 
              size={22} 
              color={isOnline ? "#5E72E4" : "#A0AEC0"} 
            />
          </TouchableOpacity>
          <View style={[styles.statusIndicator, { backgroundColor: isOnline ? '#4CAF50' : '#F44336' }]}>
            <Text style={styles.statusText}>{isOnline ? "ONLINE" : "OFFLINE"}</Text>
          </View>
        </View>
      </View>

      {/* Debug Info */}
      {debugInfo ? (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>{debugInfo}</Text>
        </View>
      ) : null}

      <View style={styles.contentContainer}>
        {/* Add Schedule Button */}
        <TouchableOpacity 
          style={[styles.addButton, (!isOnline || displaySchedulesCount >= 10) && styles.addButtonDisabled]}
          onPress={() => {
            const availableIndex = schedules.findIndex(s => s.dur === 0 && s.hour === 0 && s.min === 0);
            if (availableIndex !== -1) {
              setCurrentSchedule({
                index: availableIndex,
                hour: 8,
                min: 0,
                dur: 60,
                dow: 62,
                en: 1
              });
              setModalVisible(true);
            } else {
              Alert.alert("Maximum Reached", "You have reached the maximum of 10 schedules");
            }
          }}
          disabled={!isOnline || displaySchedulesCount >= 10}
        >
          <MaterialIcons name="add" size={24} color="white" />
          <Text style={styles.addButtonText}>ADD SCHEDULE</Text>
        </TouchableOpacity>

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <MaterialIcons name="schedule" size={32} color="#5E72E4" />
            <Text style={styles.loadingText}>Loading schedules...</Text>
          </View>
        )}

        {/* Schedules List - Show ALL schedules with non-zero values */}
        <ScrollView 
          style={styles.schedulesScrollView}
          contentContainerStyle={styles.schedulesContainer}
          showsVerticalScrollIndicator={false}
        >
          {displaySchedulesCount > 0 ? (
            displaySchedules
              .sort((a, b) => a.index - b.index)
              .map((schedule) => (
                <View key={schedule.index} style={styles.scheduleItem}>
                  <View style={styles.scheduleInfo}>
                    <View style={styles.scheduleHeader}>
                      <View style={styles.scheduleIndexBadge}>
                        <Text style={styles.scheduleIndexText}>#{schedule.index + 1}</Text>
                      </View>
                      <Text style={styles.scheduleTime}>
                        {formatTime(schedule.hour, schedule.min)}
                      </Text>
                      <Text style={styles.scheduleDuration}>
                        {schedule.dur}s
                      </Text>
                    </View>
                    <Text style={styles.scheduleDaysText}>
                      {formatDays(schedule.dow)}
                    </Text>
                    <Text style={styles.scheduleRawText}>
                      Raw: {schedule.index}:{schedule.hour}:{schedule.min}:{schedule.dur}:{schedule.dow}:{schedule.en ? 1 : 0}
                    </Text>
                  </View>
                  <View style={styles.scheduleActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => {
                        setCurrentSchedule({ ...schedule });
                        setModalVisible(true);
                      }}
                    >
                      <MaterialIcons name="edit" size={22} color="#0A4D68" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => deleteSchedule(schedule.index)}
                    >
                      <MaterialIcons name="delete" size={22} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
          ) : (
            !isLoading && (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="schedule" size={80} color="#E2E8F0" />
                <Text style={styles.emptyText}>No Schedules Yet</Text>
                <Text style={styles.emptySubtext}>
                  {isOnline 
                    ? "Add your first schedule to get started" 
                    : "Connect to device to view schedules"}
                </Text>
                {isOnline && (
                  <TouchableOpacity 
                    style={styles.retryButton}
                    onPress={refreshSchedules}
                  >
                    <Text style={styles.retryButtonText}>Refresh Schedules</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          )}
        </ScrollView>
      </View>

      {/* Schedule Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Schedule #{currentSchedule.index + 1}
              </Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#4A5568" />
              </TouchableOpacity>
            </View>
            
            {/* Time Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Start Time</Text>
              <TouchableOpacity 
                style={styles.timeInput}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.timeInputText}>
                  {formatTime(currentSchedule.hour, currentSchedule.min)}
                </Text>
                <MaterialIcons name="access-time" size={20} color="#5E72E4" />
              </TouchableOpacity>
            </View>
            
            {showTimePicker && (
              <DateTimePicker
                value={new Date(
                  new Date().getFullYear(),
                  new Date().getMonth(),
                  new Date().getDate(),
                  currentSchedule.hour,
                  currentSchedule.min
                )}
                mode="time"
                display="spinner"
                onChange={(event, selectedTime) => {
                  setShowTimePicker(false);
                  if (selectedTime) {
                    const hours = selectedTime.getHours();
                    const minutes = selectedTime.getMinutes();
                    setCurrentSchedule({
                      ...currentSchedule,
                      hour: hours,
                      min: minutes
                    });
                  }
                }}
              />
            )}

            {/* Duration Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duration (seconds)</Text>
              <View style={styles.durationContainer}>
                <TextInput
                  style={styles.durationInput}
                  keyboardType="numeric"
                  value={String(currentSchedule.dur)}
                  onChangeText={(text) => setCurrentSchedule({
                    ...currentSchedule,
                    dur: parseInt(text) || 0
                  })}
                  maxLength={4}
                />
                <Text style={styles.durationUnit}>seconds</Text>
              </View>
            </View>

            {/* Days Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Repeat on</Text>
              <View style={styles.daysRow}>
                {Object.keys(daysValues).map(day => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      isDaySelected(day) && styles.dayButtonSelected
                    ]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={isDaySelected(day) ? styles.dayButtonTextSelected : styles.dayButtonText}>
                      {day.substring(0, 1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.daysHint}>
                {formatDays(currentSchedule.dow)}
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveSchedule}
                disabled={!isOnline}
              >
                <Text style={styles.saveButtonText}>
                  {isOnline ? "SAVE" : "OFFLINE"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
  },
  scheduleCount: {
    fontSize: 14,
    color: '#718096',
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  refreshButtonDisabled: {
    opacity: 0.5,
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
  debugContainer: {
    backgroundColor: '#EDF2F7',
    padding: 10,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  debugText: {
    fontSize: 12,
    color: '#4A5568',
    fontFamily: 'monospace',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5E72E4',
    borderRadius: 10,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  addButtonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  addButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    marginBottom: 20,
  },
  loadingText: {
    color: '#4A5568',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  schedulesScrollView: {
    flex: 1,
  },
  schedulesContainer: {
    paddingBottom: 30,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleIndexBadge: {
    backgroundColor: '#5E72E4',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 12,
  },
  scheduleIndexText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  scheduleTime: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginRight: 12,
  },
  scheduleDuration: {
    fontSize: 16,
    color: '#718096',
    fontWeight: '500',
  },
  scheduleDaysText: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 4,
  },
  scheduleRawText: {
    fontSize: 10,
    color: '#A0AEC0',
    fontFamily: 'monospace',
  },
  scheduleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A5568',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#5E72E4',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
  },
  closeButton: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  timeInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 16,
    backgroundColor: '#F8F9FA',
  },
  timeInputText: {
    fontSize: 18,
    color: '#2D3748',
    fontWeight: '500',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#F8F9FA',
    marginRight: 12,
  },
  durationUnit: {
    fontSize: 14,
    color: '#718096',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dayButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayButtonSelected: {
    backgroundColor: '#5E72E4',
    borderColor: '#5E72E4',
  },
  dayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A0AEC0',
  },
  dayButtonTextSelected: {
    fontSize: 13,
    fontWeight: '600',
    color: 'white',
  },
  daysHint: {
    fontSize: 14,
    color: '#5E72E4',
    marginTop: 12,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  saveButton: {
    backgroundColor: '#5E72E4',
  },
  saveButtonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A5568',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
});

export default SchedulerPage;