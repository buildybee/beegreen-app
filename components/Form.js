import React, { useState, useEffect } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  TouchableOpacity,
} from "react-native";
import { WebView } from "react-native-webview";
import * as SecureStore from "expo-secure-store";

const Form = ({ navigation }) => {
  const [savedData, setSavedData] = useState(null);
  const [webViewLoaded, setWebViewLoaded] = useState(false);
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

  useEffect(() => {
    const fetchSavedData = async () => {
      const config = await SecureStore.getItemAsync("config");
      console.log("Fetched config from SecureStore:", config); // Debugging
      if (config) {
        setSavedData(JSON.parse(config));
      } else {
        console.log("No config found, showing WebView immediately"); // Debugging
        // Set a timeout to show a message if the WebView doesn't load in 5 seconds
        const timeout = setTimeout(() => {
          if (!webViewLoaded) {
            setShowTimeoutMessage(true);
          }
        }, 5000); // 5-second timeout
        return () => clearTimeout(timeout); // Cleanup timeout
      }
    };

    fetchSavedData();
  }, [webViewLoaded]);

  const handleDelete = async () => {
    // Delete the saved data
    await SecureStore.deleteItemAsync("config");

    // Clear the savedData state
    setSavedData(null);
  };

  const handleWebViewMessage = async (event) => {
    console.log("Received message from WebView:", event.nativeEvent.data); // Debugging
    const formData = new URLSearchParams(event.nativeEvent.data);
    const config = {
      wifiSSID: formData.get("s"),
      wifiPassword: formData.get("p"),
      mqttServer: formData.get("mqtt_server"),
      mqttPort: formData.get("mqtt_port"),
      mqttUser: formData.get("username"),
      mqttPassword: formData.get("password"),
    };

    console.log("Parsed config:", config); // Debugging

    // Save the configuration to SecureStore
    await SecureStore.setItemAsync("config", JSON.stringify(config));
    setSavedData(config);
    console.log("Navigating to Control screen"); // Debugging
    navigation.replace("Control"); // Navigate to Control page
  };

  return (
      savedData ? (
        <View style={styles.savedDataContainer}>
          <Text style={styles.savedDataText}>
            WiFi SSID: {savedData.wifiSSID}
          </Text>
          <Text style={styles.savedDataText}>
            WiFi Password: {savedData.wifiPassword}
          </Text>
          <Text style={styles.savedDataText}>
            MQTT Server: {savedData.mqttServer}
          </Text>
          <Text style={styles.savedDataText}>
            MQTT Port: {savedData.mqttPort}
          </Text>
          <Text style={styles.savedDataText}>
            MQTT User: {savedData.mqttUser}
          </Text>
          <Text style={styles.savedDataText}>
            MQTT Password: {savedData.mqttPassword}
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <MaterialIcons name="delete" size={24} color="red" />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {showTimeoutMessage && !webViewLoaded ? (
            <View style={styles.timeoutMessageContainer}>
              <Text style={styles.timeoutMessageText}>
                Check if Wi-Fi is connected to BeeGreen...
              </Text>
            </View>
          ) : (
            <WebView
              source={{ uri: "http://192.168.4.1/wifi" }}
              allowsFullscreenVideo={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onMessage={handleWebViewMessage}
              onError={(error) => console.error("WebView error:", error)} // Debugging
              onLoadEnd={() => {
                console.log("WebView loaded"); // Debugging
                setWebViewLoaded(true); // Mark WebView as loaded
              }}
            />
          )}
        </>
      )
    
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#228B22",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    fontSize: 40,
    color: "#fff",
    marginBottom: 20,
    fontWeight: "bold",
  },
  savedDataContainer: {
    marginTop: 30,
    width: "80%",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 5,
    position: "relative", // For positioning the delete button
  },
  savedDataText: {
    fontSize: 16,
    marginBottom: 10,
    color: "#000",
  },
  deleteButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  timeoutMessageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  timeoutMessageText: {
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
  },
});

export default Form;