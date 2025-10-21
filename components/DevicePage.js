import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Paho from 'paho-mqtt';
import * as SecureStore from 'expo-secure-store';
import DefaultPage from './DefaultPage'; // Import DefaultPage

const DevicePage = ({ navigation }) => {
  const [firmwareVersion, setFirmwareVersion] = useState(null);
  const [isDeviceAdded, setIsDeviceAdded] = useState(false);
  const [client, setClient] = useState(null);
  const [deviceAdded, setDeviceAdded] = useState(false);
  const [mqttUser, setMqttUser] = useState('');
  const [mqttServer, setMqttServer] = useState('');
  const [mqttPort, setMqttPort] = useState('');
  const [mqttPassword, setMqttPassword] = useState('');

  useEffect(() => {
    const fetchSavedData = async () => {
      const config = await SecureStore.getItemAsync('config');
      if (config) {
        console.log(config);
        const parsedConfig = JSON.parse(config);
        setDeviceAdded(parsedConfig.deviceAdded || false);
        if (parsedConfig.deviceAdded) {
          console.log('Device added.......Device page');
          // Initialize MQTT client
          const mqttClient = new Paho.Client(
            parsedConfig.mqttServer,
            Number(parsedConfig.mqttPort),
            'clientId-' + Math.random().toString(16).substr(2, 8)
          );

          console.log('mqtt client created.........');

          mqttClient.onMessageArrived = message => {
            if (message.destinationName === 'beegreen/status') {
              const data = JSON.parse(message.payloadString);
              // setFirmwareVersion(data.firmwareVersion);
              console.log('onMessageArrived section.........');
              console.log(data);
            }
          };

          mqttClient.connect({
            onSuccess: () => {
              console.log('mqtt on device connected');
              mqttClient.subscribe('#');
            },
            useSSL: true,
            mqttUser: parsedConfig.mqttUser,
            mqttPassword: parsedConfig.mqttPassword,
            deviceAdded: parsedConfig.deviceAdded,
            firmwareVersion: data.firmwareVersion,
          });

          mqttClient.onMessageArrived = message => {
            const data = JSON.parse(message.payloadString);
            setFirmwareVersion(data.firmwareVersion);
            console.log('onMessageArrived section........');
            console.log(data);
          };

          setClient(mqttClient);
        }
      }
    };

    fetchSavedData();
  }, []);

  if (!deviceAdded) {
    return <DefaultPage navigation={navigation} />; // Show default page if device is not added
  }

  return (
    <SafeAreaView style={styles.container}>
      {deviceAdded ? (
        <View style={styles.content}>
          <Text style={styles.title}>Firmware Version:</Text>
          <Text style={styles.version}>{firmwareVersion}</Text>
        </View>
      ) : (
        <View style={styles.placeholder}>
          <MaterialIcons name='add' size={100} color='#ccc' />
          <Text style={styles.placeholderText}>No device added</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#fff',
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  placeholder: {
    alignItems: 'center',
  },
  placeholderText: {
    color: '#ccc',
    fontSize: 18,
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  version: {
    color: '#666',
    fontSize: 20,
  },
});

export default DevicePage;
