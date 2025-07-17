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
  Switch,
  Modal,
  Dimensions
} from "react-native";
import * as SecureStore from "expo-secure-store";
import Paho from "paho-mqtt";
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Custom Picker Component
const CustomPicker = ({ items, selectedValue, onValueChange, label }) => {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.customPickerContainer}>
      <TouchableOpacity 
        onPress={() => setVisible(true)}
        style={styles.customPickerButton}
      >
        <Text style={styles.customPickerText}>{selectedValue}</Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color="#0A4D68" />
      </TouchableOpacity>
      
      <Modal visible={visible} transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView style={styles.pickerScrollView}>
              {items.map((item) => (
                <TouchableOpacity 
                  key={item.value} 
                  onPress={() => {
                    onValueChange(item.value);
                    setVisible(false);
                  }}
                  style={[
                    styles.pickerOption,
                    selectedValue === item.value && styles.selectedOption
                  ]}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    selectedValue === item.value && styles.selectedOptionText
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Text style={styles.pickerLabel}>{label}</Text>
    </View>
  );
};

const SchedulerPage = ({ navigation }) => {
  const [currentSchedule, setCurrentSchedule] = useState({
    hour: 8,
    minute: 0,
    ampm: 'AM',
    duration: 60,
    days: {
      Sunday: false,
      Monday: true,
      Tuesday: true,
      Wednesday: true,
      Thursday: true,
      Friday: true,
      Saturday: false
    },
    editingIndex: null // Track which schedule is being edited
  });

  const [savedSchedules, setSavedSchedules] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [client, setClient] = useState(null);

  // MQTT Configuration
  const mqttPort = 8884;
  const setScheduleTopic = "beegreen/set_schedule";
  const getScheduleTopic = "beegreen/get_schedule";
  const deleteScheduleTopic = "beegreen/delete_schedule";
  const pumpStatusTopic = "beegreen/pump_status";

  // Generate picker data
  const hours = Array.from({ length: 12 }, (_, i) => ({ 
    label: (i + 1).toString(), 
    value: i + 1 
  }));
  
  const minutes = Array.from({ length: 60 }, (_, i) => ({ 
    label: i.toString().padStart(2, '0'), 
    value: i 
  }));
  
  const ampm = [
    { label: 'AM', value: 'AM' },
    { label: 'PM', value: 'PM' }
  ];
  
  const durations = Array.from({ length: 301 }, (_, i) => ({ 
    label: i.toString(), 
    value: i 
  }));

  // Calculate days bitmask
  const calculateDaysBitmask = (days) => {
    let bitmask = 0;
    if (days.Sunday) bitmask |= 1;
    if (days.Monday) bitmask |= 2;
    if (days.Tuesday) bitmask |= 4;
    if (days.Wednesday) bitmask |= 8;
    if (days.Thursday) bitmask |= 16;
    if (days.Friday) bitmask |= 32;
    if (days.Saturday) bitmask |= 64;
    return bitmask;
  };

  // Handle save/update schedule
  const handleSaveSchedule = () => {
    // Convert to 24-hour format
    const hour24 = currentSchedule.ampm === 'PM' 
      ? (currentSchedule.hour === 12 ? 12 : currentSchedule.hour + 12)
      : (currentSchedule.hour === 12 ? 0 : currentSchedule.hour);

    const daysBitmask = calculateDaysBitmask(currentSchedule.days);
    const index = currentSchedule.editingIndex !== null ? currentSchedule.editingIndex : savedSchedules.length;
    const payload = `${index}:${hour24}:${currentSchedule.minute}:${currentSchedule.duration}:${daysBitmask}:1`;

    if (client && client.isConnected()) {
      const message = new Paho.Message(payload);
      message.destinationName = setScheduleTopic;
      client.send(message);
      
      if (currentSchedule.editingIndex !== null) {
        // Update existing schedule
        const updatedSchedules = [...savedSchedules];
        updatedSchedules[currentSchedule.editingIndex] = {
          index: currentSchedule.editingIndex,
          time: `${currentSchedule.hour}:${currentSchedule.minute.toString().padStart(2, '0')} ${currentSchedule.ampm}`,
          duration: currentSchedule.duration,
          days: currentSchedule.days
        };
        setSavedSchedules(updatedSchedules);
        Alert.alert("Schedule Updated", `Schedule #${index} updated`);
      } else {
        // Add new schedule
        if (savedSchedules.length >= 10) {
          Alert.alert("Limit Reached", "Maximum 10 schedules allowed");
          return;
        }
        setSavedSchedules([...savedSchedules, {
          index: index,
          time: `${currentSchedule.hour}:${currentSchedule.minute.toString().padStart(2, '0')} ${currentSchedule.ampm}`,
          duration: currentSchedule.duration,
          days: currentSchedule.days
        }]);
        Alert.alert("Schedule Added", `New schedule #${index} added`);
      }

      // Reset form
      setCurrentSchedule({
        hour: 8,
        minute: 0,
        ampm: 'AM',
        duration: 60,
        days: {
          Sunday: false,
          Monday: true,
          Tuesday: true,
          Wednesday: true,
          Thursday: true,
          Friday: true,
          Saturday: false
        },
        editingIndex: null
      });
    } else {
      Alert.alert("Error", "Not connected to device");
    }
  };

  // Handle edit schedule
  const handleEditSchedule = (index) => {
    const scheduleToEdit = savedSchedules[index];
    // Convert 24-hour to 12-hour format
    const timeParts = scheduleToEdit.time.split(' ');
    const [hourStr, minuteStr] = timeParts[0].split(':');
    let hour = parseInt(hourStr);
    const ampm = timeParts[1];
    
    if (ampm === 'PM' && hour !== 12) {
      hour -= 12;
    } else if (ampm === 'AM' && hour === 12) {
      hour = 0;
    }

    setCurrentSchedule({
      hour: hour,
      minute: parseInt(minuteStr),
      ampm: ampm,
      duration: scheduleToEdit.duration,
      days: scheduleToEdit.days,
      editingIndex: index
    });
  };

  // Handle delete schedule
  const handleDeleteSchedule = (index) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this schedule?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          onPress: () => {
            if (client && client.isConnected()) {
              const message = new Paho.Message(index.toString());
              message.destinationName = deleteScheduleTopic;
              client.send(message);
              
              const updatedSchedules = savedSchedules.filter((_, i) => i !== index);
              setSavedSchedules(updatedSchedules);
              Alert.alert("Schedule Deleted", `Schedule #${index} removed`);
            } else {
              Alert.alert("Error", "Not connected to device");
            }
          }
        }
      ]
    );
  };

  // MQTT initialization
  useFocusEffect(
    React.useCallback(() => {
      const initializeMqtt = async () => {
        const config = await SecureStore.getItemAsync("config");
        if (config) {
          const { mqttServer, mqttUser, mqttPassword } = JSON.parse(config);
          
          const mqttClient = new Paho.Client(
            mqttServer,
            mqttPort,
            "clientId-" + Math.random().toString(16).substr(2, 8)
          );

          mqttClient.onMessageArrived = (message) => {
            if (message.destinationName === getScheduleTopic) {
              try {
                const schedules = JSON.parse(message.payloadString);
                setSavedSchedules(schedules);
              } catch {
                console.log("Received non-JSON schedule data");
              }
            }
          };

          mqttClient.onConnectionLost = (response) => {
            setIsOnline(false);
          };

          mqttClient.connect({
            onSuccess: () => {
              setIsOnline(true);
              mqttClient.subscribe(getScheduleTopic);
              const msg = new Paho.Message("request");
              msg.destinationName = getScheduleTopic;
              mqttClient.send(msg);
            },
            onFailure: (err) => {
              setIsOnline(false);
            },
            useSSL: true,
            userName: mqttUser,
            password: mqttPassword,
          });

          setClient(mqttClient);
          return () => {
            if (mqttClient.isConnected()) mqttClient.disconnect();
          };
        }
      };

      initializeMqtt();
    }, [])
  );

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
        <Text style={styles.scheduleCount}>
          {savedSchedules.length}/10 schedules configured
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Time and Duration Selectors */}
        <View style={styles.timeDurationContainer}>
          {/* Start Time */}
          <View style={styles.selectorColumn}>
            <Text style={styles.selectorLabel}>Start Time</Text>
            <View style={styles.pickerRow}>
              <CustomPicker
                items={hours}
                selectedValue={currentSchedule.hour}
                onValueChange={(h) => setCurrentSchedule({...currentSchedule, hour: h})}
                label="Hour"
              />
              <CustomPicker
                items={minutes}
                selectedValue={currentSchedule.minute}
                onValueChange={(m) => setCurrentSchedule({...currentSchedule, minute: m})}
                label="Min"
              />
              <CustomPicker
                items={ampm}
                selectedValue={currentSchedule.ampm}
                onValueChange={(a) => setCurrentSchedule({...currentSchedule, ampm: a})}
                label="AM/PM"
              />
            </View>
          </View>

          {/* Duration */}
          <View style={styles.selectorColumn}>
            <Text style={styles.selectorLabel}>Duration</Text>
            <View style={styles.pickerRow}>
              <CustomPicker
                items={durations}
                selectedValue={currentSchedule.duration}
                onValueChange={(d) => setCurrentSchedule({...currentSchedule, duration: d})}
                label="Seconds"
              />
            </View>
          </View>
        </View>

        {/* Days of Week Selection */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="calendar-week" size={24} color="#0A4D68" />
            <Text style={styles.cardTitle}>Repeat Days</Text>
          </View>
          {Object.keys(currentSchedule.days).map(day => (
            <View key={day} style={styles.dayRow}>
              <Text style={styles.dayLabel}>{day}</Text>
              <Switch
                value={currentSchedule.days[day]}
                onValueChange={(value) => setCurrentSchedule({
                  ...currentSchedule,
                  days: {...currentSchedule.days, [day]: value}
                })}
                trackColor={{ false: "#E2E8F0", true: "#0A4D68" }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>

        {/* Save/Update Button */}
        <TouchableOpacity 
          style={[
            styles.addButton, 
            { 
              backgroundColor: isOnline ? '#0A4D68' : '#CCCCCC',
              opacity: (savedSchedules.length >= 10 && currentSchedule.editingIndex === null) ? 0.5 : 1
            }
          ]} 
          onPress={handleSaveSchedule}
          disabled={!isOnline || (savedSchedules.length >= 10 && currentSchedule.editingIndex === null)}
        >
          <MaterialCommunityIcons 
            name={currentSchedule.editingIndex !== null ? "content-save" : "plus"} 
            size={24} 
            color="#fff" 
          />
          <Text style={styles.addButtonText}>
            {currentSchedule.editingIndex !== null ? "UPDATE SCHEDULE" : "ADD SCHEDULE"}
          </Text>
        </TouchableOpacity>

        {/* Cancel Edit Button (only shown when editing) */}
        {currentSchedule.editingIndex !== null && (
          <TouchableOpacity 
            style={[styles.cancelButton, { backgroundColor: '#F44336' }]} 
            onPress={() => setCurrentSchedule({
              hour: 8,
              minute: 0,
              ampm: 'AM',
              duration: 60,
              days: {
                Sunday: false,
                Monday: true,
                Tuesday: true,
                Wednesday: true,
                Thursday: true,
                Friday: true,
                Saturday: false
              },
              editingIndex: null
            })}
          >
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
            <Text style={styles.addButtonText}>CANCEL EDIT</Text>
          </TouchableOpacity>
        )}

        {/* Active Schedules List */}
        {savedSchedules.length > 0 && (
          <View style={styles.schedulesCard}>
            <Text style={styles.schedulesTitle}>Active Schedules</Text>
            {savedSchedules.map((schedule, index) => (
              <View key={index} style={styles.scheduleItem}>
                <View style={styles.scheduleInfo}>
                  <Text style={styles.scheduleText}>
                    #{index}: {schedule.time} for {schedule.duration}s
                  </Text>
                  <Text style={styles.scheduleDays}>
                    {Object.keys(schedule.days).filter(day => schedule.days[day]).join(', ')}
                  </Text>
                </View>
                <View style={styles.scheduleActions}>
                  <TouchableOpacity 
                    onPress={() => handleEditSchedule(index)}
                    style={styles.actionButton}
                  >
                    <MaterialCommunityIcons name="pencil" size={20} color="#0A4D68" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleDeleteSchedule(index)}
                    style={styles.actionButton}
                  >
                    <MaterialCommunityIcons name="delete" size={20} color="#F44336" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
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
    marginBottom: 8,
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
  scheduleCount: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    marginTop: 8,
  },
  content: {
    paddingBottom: 20,
  },
  timeDurationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  selectorColumn: {
    flex: 1,
    marginHorizontal: 8,
  },
  selectorLabel: {
    fontSize: 16,
    color: '#4A5568',
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  customPickerContainer: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  customPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F7F8',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  customPickerText: {
    fontSize: 16,
    color: '#0A4D68',
  },
  pickerLabel: {
    fontSize: 12,
    color: '#718096',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 10,
    maxHeight: 300,
  },
  pickerScrollView: {
    padding: 10,
  },
  pickerOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#4A5568',
  },
  selectedOption: {
    backgroundColor: '#F0F4FF',
  },
  selectedOptionText: {
    color: '#0A4D68',
    fontWeight: 'bold',
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  schedulesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleText: {
    fontSize: 16,
    color: '#4A5568',
  },
  scheduleDays: {
    fontSize: 14,
    color: '#718096',
    marginTop: 4,
  },
  scheduleActions: {
    flexDirection: 'row',
  },
  actionButton: {
    marginLeft: 15,
  },
});

export default SchedulerPage;