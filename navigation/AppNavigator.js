import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import * as SecureStore from "expo-secure-store";
import { MaterialIcons } from "@expo/vector-icons";
import Form from "../components/Form";
import SchedulerPage from "../components/SchedulerPage";
import TimelinePage from "../components/TimelinePage";
import LoginPage from "../components/LoginPage"; // Import LoginPage

const Stack = createStackNavigator();

const AppNavigator = () => {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState("Login"); // Default to Login

  useEffect(() => {
    const checkConfig = async () => {
      const config = await SecureStore.getItemAsync("config");
      if (config) {
        setInitialRoute("Control"); // Navigate to Control if config exists
      }
      setIsReady(true);
    };

    checkConfig();
  }, []);

  if (!isReady) {
    return null; // Show a loading screen or splash screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen
          name="Login"
          component={LoginPage}
          options={{ headerShown: false }} // Hide header for Login Page
        />
        <Stack.Screen
          name="Form"
          component={Form}
          options={({ navigation }) => ({
            headerShown: true,
            headerTitle: "BeeGreen",
            headerLeft: () => (
              <MaterialIcons
                name="menu"
                size={24}
                color="black"
                style={{ marginLeft: 15 }}
                onPress={() => navigation.navigate("Control")}
              />
            ),
          })}
        />
        <Stack.Screen
          name="Control"
          component={SchedulerPage}
          options={({ navigation }) => ({
            headerShown: true,
            headerTitle: "BeeGreen",
            headerLeft: () => (
              <MaterialIcons
                name="arrow-back"
                size={24}
                color="black"
                style={{ marginLeft: 15 }}
                onPress={() => navigation.navigate("Form")}
              />
            ),
            headerRight: () => (
              <MaterialIcons
                name="timeline"
                size={24}
                color="black"
                style={{ marginRight: 15 }}
                onPress={() => navigation.navigate("Timeline")}
              />
            ),
          })}
        />
        <Stack.Screen
          name="Timeline"
          component={TimelinePage}
          options={({ navigation }) => ({
            headerShown: true,
            headerTitle: "Timeline",
            headerLeft: () => (
              <MaterialIcons
                name="arrow-back"
                size={24}
                color="black"
                style={{ marginLeft: 15 }}
                onPress={() => navigation.navigate("Control")}
              />
            ),
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;