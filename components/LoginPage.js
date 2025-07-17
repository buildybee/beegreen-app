import React, { useState } from "react";
import { 
  View, 
  StyleSheet, 
  SafeAreaView, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  Modal, 
  ScrollView,
  ActivityIndicator,
  Linking
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import * as Network from "expo-network";
import Paho from "paho-mqtt";
import Constants from "expo-constants";

const LoginPage = ({ navigation }) => {
  // MQTT Connection States
  const [mqttUser, setMqttUser] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [mqttServer, setMqttServer] = useState('');
  const [mqttPort, setMqttPort] = useState('8884');
  const [mqttPassword, setMqttPassword] = useState('');
  
  // WiFi Configuration States
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [wifiNetworks, setWifiNetworks] = useState([]);
  const [selectedWifi, setSelectedWifi] = useState(null);
  const [wifiSSID, setWifiSSID] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [showWifiForm, setShowWifiForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Enhanced fetch with Android compatibility
  const deviceFetch = async (url, options = {}) => {
    try {
      // Try regular fetch first
      const response = await fetch(url, {
        ...options,
        timeout: 10000,
        headers: {
          ...options.headers,
          'Connection': 'close'
        }
      });
      return response;
    } catch (error) {
      console.log('Standard fetch failed, trying XMLHttpRequest');
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.timeout = 10000;
        xhr.open(options.method || 'GET', url);
        
        xhr.onload = () => {
          resolve({
            ok: xhr.status >= 200 && xhr.status < 300,
            status: xhr.status,
            json: () => Promise.resolve(JSON.parse(xhr.responseText)),
            text: () => Promise.resolve(xhr.responseText)
          });
        };
        
        xhr.onerror = () => reject(new Error("Network request failed"));
        xhr.ontimeout = () => reject(new Error("Request timed out"));
        
        if (options.headers) {
          Object.entries(options.headers).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value);
          });
        }
        
        xhr.send(options.body);
      });
    }
  };

  const checkDeviceConnection = async () => {
    try {
      // Check if connected to WiFi
      const { isConnected } = await Network.getNetworkStateAsync();
      if (!isConnected) {
        Alert.alert(
          "Not Connected",
          "Please connect to your device's WiFi network first",
          [
            { text: 'Open WiFi Settings', onPress: () => Linking.openSettings() },
            { text: 'OK' }
          ]
        );
        return false;
      }

      // Verify we're on the right network (192.168.4.x)
      const ip = await Network.getIpAddressAsync();
      if (!ip.startsWith('192.168.4.')) {
        Alert.alert(
          "Wrong Network",
          `Please connect to your device's WiFi network (current IP: ${ip})`,
          [
            { text: 'Open WiFi Settings', onPress: () => Linking.openSettings() },
            { text: 'OK' }
          ]
        );
        return false;
      }

      // Test if device is responding
      try {
        const ping = await deviceFetch('http://192.168.4.1', { method: 'HEAD' });
        if (!ping.ok) throw new Error("Device not responding");
        return true;
      } catch (pingError) {
        throw new Error("Device not reachable. Please ensure it's powered on");
      }
    } catch (error) {
      Alert.alert("Connection Error", error.message);
      return false;
    }
  };

  const handleLogin = async () => {
    if (!mqttUser || !mqttPassword || !mqttServer || !mqttPort) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    setIsConnecting(true);

    try {
      const mqttClient = new Paho.Client(
        mqttServer,
        Number(mqttPort),
        "clientId-" + Math.random().toString(16).substr(2, 8)
      );

      await new Promise((resolve, reject) => {
        mqttClient.onConnectionLost = (responseObject) => {
          reject(new Error(responseObject.errorMessage));
        };

        mqttClient.connect({
          userName: mqttUser,
          password: mqttPassword,
          useSSL: true,
          onSuccess: resolve,
          onFailure: reject,
          timeout: 10
        });
      });

      console.log("Connected to MQTT broker");
      setShowAddDevice(true);
      
      const config = {
        mqttServer,
        mqttPort, 
        mqttUser,
        mqttPassword,
        deviceAdded: false,
        schedulerSet: false,
      };
      
      await SecureStore.setItemAsync("config", JSON.stringify(config));
      Alert.alert("Success", "MQTT configuration saved successfully!");
    } catch (error) {
      console.error("Connection error:", error);
      Alert.alert("Error", `Failed to connect to MQTT broker: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const scanWifiNetworks = async () => {
  try {
    setIsScanning(true);
    
    if (!(await checkDeviceConnection())) return;

    // First try the standard endpoint
    let response = await deviceFetch('http://192.168.4.1/wifiscan');
    let data = await response.text(); // Get raw response first
    
    // Try to parse as JSON, fallback to plain text
    try {
      data = JSON.parse(data);
    } catch (e) {
      console.log('Response not JSON, trying alternative endpoints');
      
      // Try common alternative endpoints
      const endpoints = [
        'http://192.168.4.1/scan',
        'http://192.168.4.1/wifiscan',
        'http://192.168.4.1/wifi-scan'
      ];
      
      for (const endpoint of endpoints) {
        try {
          response = await deviceFetch(endpoint);
          data = await response.json();
          break; // Exit loop if successful
        } catch (err) {
          console.log(`Failed on ${endpoint}`, err);
        }
      }
    }

    console.log('Final scan response:', data);
    
    // Handle different response formats
    if (typeof data === 'string') {
      // If response is plain text, try to extract networks
      const networks = data.split('\n')
        .filter(line => line.includes('SSID:'))
        .map(line => {
          const ssid = line.replace('SSID:', '').trim();
          return { ssid, rssi: -50 }; // Default signal strength
        });
      
      if (networks.length > 0) {
        setWifiNetworks(networks);
        setShowWifiModal(true);
        return;
      }
      throw new Error("No networks found in text response");
    }
    else if (Array.isArray(data)) {
      // Handle array response format
      setWifiNetworks(data);
      setShowWifiModal(true);
    }
    else if (data.networks) {
      // Handle object with networks property
      setWifiNetworks(data.networks);
      setShowWifiModal(true);
    }
    else {
      throw new Error("Unexpected response format");
    }
  } catch (error) {
    console.error('WiFi Scan Error:', error);
    Alert.alert(
      "Scan Failed",
      error.message.includes("No networks")
        ? "No WiFi networks found. Please ensure:\n\n1. Your device has WiFi capability\n2. There are networks in range\n3. The device firmware supports scanning"
        : error.message
    );
  } finally {
    setIsScanning(false);
  }
};

  const handleWifiSelect = (wifi) => {
    setSelectedWifi(wifi);
    setWifiSSID(wifi.ssid);
    setShowWifiForm(true);
  };

  const saveWifiCredentials = async () => {
    try {
      setIsSaving(true);
      
      if (!(await checkDeviceConnection())) return;

      const formData = new URLSearchParams();
      formData.append('s', wifiSSID);
      formData.append('p', wifiPassword);
      formData.append('mqtt_server', mqttServer);
      formData.append('mqtt_port', '8883');
      formData.append('username', mqttUser);
      formData.append('password', mqttPassword);

      const response = await deviceFetch('http://192.168.4.1/wifisave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const responseData = await response.text();
      console.log('WiFi save response:', responseData);

      await SecureStore.setItemAsync("config", JSON.stringify({
        mqttServer,
        mqttPort,
        mqttUser,
        mqttPassword,
        deviceAdded: true,
        wifiSSID,
        wifiPassword,
        schedulerSet: false,
      }));

      Alert.alert("Success", `WiFi credentials saved for ${wifiSSID}`);
      setShowWifiForm(false);
      setShowWifiModal(false);
      setShowAddDevice(false);
    } catch (error) {
      console.error('Error saving WiFi credentials:', error);
      Alert.alert("Error", `Failed to save WiFi credentials: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.signupContainer}>
        <Text style={styles.signupText}>BeeGreen</Text>
        <Text style={styles.subtitle}>Enter MQTT connection details</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Enter MQTT User"
          placeholderTextColor="#aaa"
          value={mqttUser}
          onChangeText={setMqttUser}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Enter MQTT Password"
          placeholderTextColor="#aaa"
          value={mqttPassword}
          onChangeText={setMqttPassword}
          secureTextEntry={true}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Enter MQTT Server"
          placeholderTextColor="#aaa"
          value={mqttServer}
          onChangeText={setMqttServer}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Enter MQTT Port"
          placeholderTextColor="#aaa"
          value={mqttPort}
          onChangeText={setMqttPort}
          keyboardType="numeric"
        />
        
        <TouchableOpacity 
          style={styles.signupButton} 
          onPress={handleLogin}
          activeOpacity={0.8}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.signupButtonText}>Connect</Text>
          )}
        </TouchableOpacity>

        {showAddDevice && (
          <TouchableOpacity 
            style={[styles.signupButton, { backgroundColor: '#4CAF50', marginTop: 20 }]} 
            onPress={scanWifiNetworks}
            activeOpacity={0.8}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.signupButtonText}>ADD DEVICE</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* WiFi Networks Modal */}
      <Modal
        visible={showWifiModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWifiModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Available WiFi Networks</Text>
            <ScrollView style={styles.wifiList}>
              {wifiNetworks.length > 0 ? (
                wifiNetworks.map((wifi, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.wifiItem}
                    onPress={() => handleWifiSelect(wifi)}
                  >
                    <Text style={styles.wifiText}>
                      {wifi.ssid} (Signal: {wifi.rssi} dBm)
                    </Text>
                    <MaterialIcons name="wifi" size={20} color={
                      wifi.rssi > -50 ? '#4CAF50' : 
                      wifi.rssi > -70 ? '#FFC107' : '#F44336'
                    } />
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noNetworksText}>No networks found</Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowWifiModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* WiFi Credentials Form Modal */}
      <Modal
        visible={showWifiForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWifiForm(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter WiFi Credentials</Text>
            <Text style={styles.selectedWifiText}>
              Network: {selectedWifi?.ssid} (Signal: {selectedWifi?.rssi} dBm)
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="WiFi SSID"
              placeholderTextColor="#aaa"
              value={wifiSSID}
              onChangeText={setWifiSSID}
              editable={false}
            />
            
            <TextInput
              style={styles.input}
              placeholder="WiFi Password"
              placeholderTextColor="#aaa"
              value={wifiPassword}
              onChangeText={setWifiPassword}
              secureTextEntry={true}
              autoCapitalize="none"
            />
            
            <TouchableOpacity 
              style={[styles.signupButton, { marginTop: 20 }]} 
              onPress={saveWifiCredentials}
              activeOpacity={0.8}
              disabled={isSaving || !wifiPassword}
            >
              {isSaving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.signupButtonText}>Save WiFi Credentials</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.closeButton, { marginTop: 10 }]}
              onPress={() => setShowWifiForm(false)}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2E8B57",
    alignItems: "center",
    justifyContent: "center",
  },
  signupContainer: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  signupText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 28,
    marginBottom: 5,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginBottom: 25,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    color: 'white',
    fontSize: 16,
  },
  signupButton: {
    backgroundColor: '#1E6F9F',
    width: '100%',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  signupButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  selectedWifiText: {
    textAlign: 'center',
    marginBottom: 15,
    color: '#555',
  },
  wifiList: {
    maxHeight: 300,
    marginBottom: 15,
  },
  wifiItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wifiText: {
    fontSize: 16,
    color: '#333',
  },
  noNetworksText: {
    textAlign: 'center',
    padding: 10,
    color: '#777',
  },
  closeButton: {
    backgroundColor: '#f44336',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default LoginPage;