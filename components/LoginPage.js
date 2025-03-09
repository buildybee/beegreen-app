const handleLogin = () => {
    if (!username || !password || !mqttServer || !mqttPort) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
  
    setIsConnecting(true);
  
    // Initialize MQTT client
    const mqttClient = new Paho.Client(
      mqttServer,
      Number(mqttPort),
      "clientId-" + Math.random().toString(16).substr(2, 8)
    );
  
    // Set callback handlers
    mqttClient.onConnectionLost = (responseObject) => {
      setIsConnecting(false);
      if (responseObject.errorCode !== 0) {
        Alert.alert("Error", "Connection lost: " + responseObject.errorMessage);
      }
    };
  
    // Connect to the MQTT broker
    mqttClient.connect({
      onSuccess: () => {
        console.log("Connected to MQTT broker");
        setIsConnecting(false);
  
        // Save configuration to SecureStore
        const config = {
          mqttServer,
          mqttPort,
          mqttUser: username,
          mqttPassword: password,
          deviceAdded: true, // Set deviceAdded to true
          schedulerSet: false, // Default to false
        };
        SecureStore.setItemAsync("config", JSON.stringify(config))
          .then(() => {
            Alert.alert("Success", "Configuration saved successfully.");
            navigation.replace("Control"); // Navigate to Control Page
          })
          .catch((error) => {
            console.error("Error saving configuration:", error);
            Alert.alert("Error", "Failed to save configuration.");
          });
      },
      onFailure: (err) => {
        setIsConnecting(false);
        Alert.alert("Error", "Failed to connect to MQTT broker: " + err.errorMessage);
      },
      useSSL: true,
      userName: username,
      password: password,
    });
  };