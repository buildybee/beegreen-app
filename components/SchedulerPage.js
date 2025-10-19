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
    en: false
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
    en: true
  });
  const [client, setClient] = useState(null);

  // MQTT Topics
  const topics = {
    setSchedule: "beegreen/set_schedule",
    requestSchedules: "beegreen/gets_schedules",
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

  // Load schedules from SecureStore on initial render
  useEffect(() => {
    const loadSchedules = async () => {
      try {
        const savedSchedules = await SecureStore.getItemAsync("schedules");
        if (savedSchedules) {
          setSchedules(JSON.parse(savedSchedules));
        }
      } catch (error) {
        console.error("Error loading schedules:", error);
      }
    };
    loadSchedules();
  }, []);

  // Save schedules to SecureStore whenever they change
  useEffect(() => {
    const saveSchedules = async () => {
      try {
        await SecureStore.setItemAsync("schedules", JSON.stringify(schedules));
      } catch (error) {
        console.error("Error saving schedules:", error);
      }
    };
    saveSchedules();
  }, [schedules]);

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
          if (message.destinationName === topics.getSchedulesResponse) {
            try {
              const receivedSchedules = JSON.parse(message.payloadString);
              if (Array.isArray(receivedSchedules)) {
                setSchedules(receivedSchedules);
              }
            } catch (error) {
              console.error("Error parsing schedules:", error);
            }
          } else if (message.destinationName === topics.heartbeat) {
            setIsOnline(true);
          }
        };

        mqttClient.onConnectionLost = () => {
          setIsOnline(false);
        };

        mqttClient.connect({
          onSuccess: () => {
            mqttClient.subscribe(topics.getSchedulesResponse);
            mqttClient.subscribe(topics.heartbeat);
            requestSchedules(mqttClient);
          },
          onFailure: (err) => {
            console.error("Connection failed:", err);
            setIsOnline(false);
          },
          useSSL: true,
          userName: mqttUser,
          password: mqttPassword,
        });

        setClient(mqttClient);
      }
    };

    initializeMqtt();

    return () => {
      if (client) {
        client.disconnect();
      }
    };
  }, []);

  const requestSchedules = (mqttClient) => {
    const message = new Paho.Message("");
    message.destinationName = topics.requestSchedules;
    mqttClient.send(message);
  };

  const saveSchedule = () => {
    if (!client || !client.isConnected()) {
      Alert.alert("Error", "Not connected to device");
      return;
    }

    const { index, hour, min, dur, dow, en } = currentSchedule;
    const payload = `${index}:${hour}:${min}:${dur}:${dow}:${en ? 1 : 0}`;

    const message = new Paho.Message(payload);
    message.destinationName = topics.setSchedule;
    client.send(message);

    // Update local state immediately
    const updatedSchedules = [...schedules];
    updatedSchedules[index] = { ...currentSchedule };
    setSchedules(updatedSchedules);

    setModalVisible(false);
  };

  const deleteSchedule = (index) => {
    if (!client || !client.isConnected()) {
      Alert.alert("Error", "Not connected to device");
      return;
    }

    const payload = `${index}:0:0:0:0:0`;

    const message = new Paho.Message(payload);
    message.destinationName = topics.setSchedule;
    client.send(message);

    // Update local state immediately
    const updatedSchedules = [...schedules];
    updatedSchedules[index] = {
      index,
      hour: 0,
      min: 0,
      dur: 0,
      dow: 0,
      en: false
    };
    setSchedules(updatedSchedules);
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Irrigation Scheduler</Text>
        <View style={[styles.statusIndicator, { backgroundColor: isOnline ? '#4CAF50' : '#F44336' }]}>
          <Text style={styles.statusText}>{isOnline ? "ONLINE" : "OFFLINE"}</Text>
        </View>
      </View>

      <View style={styles.contentContainer}>
        {/* Add Schedule Button */}
        {schedules.filter(s => s.en).length > -1 && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => {
              const availableIndex = schedules.findIndex(s => !s.en);
              setCurrentSchedule({
                index: availableIndex,
                hour: 8,
                min: 0,
                dur: 60,
                dow: 62,
                en: true
              });
              setModalVisible(true);
            }}
          >
            <MaterialIcons name="add" size={24} color="white" />
            <Text style={styles.addButtonText}>ADD SCHEDULE</Text>
          </TouchableOpacity>
        )}

        {/* Schedules List */}
        <ScrollView 
          style={styles.schedulesScrollView}
          contentContainerStyle={styles.schedulesContainer}
        >
          {schedules.filter(s => s.en).length > 0 ? (
            schedules.filter(s => s.en).map((schedule) => (
              <View key={schedule.index} style={styles.scheduleItem}>
                <View style={styles.scheduleInfo}>
                  <Text style={styles.scheduleTime}>
                    #{schedule.index + 1}: {formatTime(schedule.hour, schedule.min)} for {schedule.dur}s
                  </Text>
                  <View style={styles.scheduleDays}>
                    {Object.keys(daysValues).map(day => (
                      schedule.dow & daysValues[day] ? (
                        <Text key={day} style={styles.dayPill}>{day.substring(0, 3)}</Text>
                      ) : null
                    ))}
                  </View>
                </View>
                <View style={styles.scheduleActions}>
                  <TouchableOpacity 
                    onPress={() => {
                      setCurrentSchedule({ ...schedule });
                      setModalVisible(true);
                    }}
                  >
                    <MaterialIcons name="edit" size={20} color="#0A4D68" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => deleteSchedule(schedule.index)}
                  >
                    <MaterialIcons name="delete" size={20} color="#F44336" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No schedules configured</Text>
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
            <Text style={styles.modalTitle}>
              {currentSchedule.index !== undefined ? `Schedule #${currentSchedule.index + 1}` : "New Schedule"}
            </Text>
            
            {/* Time Selection */}
            <TouchableOpacity 
              style={styles.timeInput}
              onPress={() => setShowTimePicker(true)}
            >
              <Text>
                {formatTime(currentSchedule.hour, currentSchedule.min)}
              </Text>
            </TouchableOpacity>
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
            <View style={styles.durationContainer}>
              <Text>Duration (seconds):</Text>
              <TextInput
                style={styles.durationInput}
                keyboardType="numeric"
                value={String(currentSchedule.dur)}
                onChangeText={(text) => setCurrentSchedule({
                  ...currentSchedule,
                  dur: parseInt(text) || 0
                })}
              />
            </View>

            {/* Days Selection */}
            <View style={styles.daysContainer}>
              <Text>Repeat on:</Text>
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
                      {day.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveSchedule}
              >
                <Text style={styles.modalButtonText}>SAVE</Text>
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
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5E72E4',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 10,
  },
  schedulesScrollView: {
    flex: 1,
  },
  schedulesContainer: {
    paddingBottom: 20,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  scheduleDays: {
    flexDirection: 'row',
    marginTop: 8,
  },
  dayPill: {
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    fontSize: 12,
  },
  scheduleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  emptyText: {
    textAlign: 'center',
    color: '#718096',
    marginTop: 20,
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  durationInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 8,
    width: 80,
    textAlign: 'center',
  },
  daysContainer: {
    marginBottom: 24,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
  },
  dayButtonSelected: {
    backgroundColor: '#5E72E4',
  },
  dayButtonText: {
    color: '#2D3748',
  },
  dayButtonTextSelected: {
    color: 'white',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#E2E8F0',
  },
  saveButton: {
    backgroundColor: '#5E72E4',
  },
  modalButtonText: {
    fontWeight: '600',
  },
});

export default SchedulerPage;