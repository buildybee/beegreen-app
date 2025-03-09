import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import * as SecureStore from "expo-secure-store";
import { MaterialIcons } from "@expo/vector-icons";
import DevicePage from "../components/DevicePage";
import SchedulerPage from "../components/SchedulerPage";
import ControlPage from "../components/ControlPage";
import TimelinePage from "../components/TimelinePage";
import AccountInfoPage from "../components/AccountInfoPage";

const Drawer = createDrawerNavigator();

const AppNavigator = () => {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState("Device");

  useEffect(() => {
    const checkConfig = async () => {
      const config = await SecureStore.getItemAsync("config");
      if (config) {
        setInitialRoute("Device"); // Default to Device Page
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
      <Drawer.Navigator initialRouteName={initialRoute}>
        <Drawer.Screen
          name="Device"
          component={DevicePage}
          options={{
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="devices" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Scheduler"
          component={SchedulerPage}
          options={{
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="schedule" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Control"
          component={ControlPage}
          options={{
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="settings" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Timeline"
          component={TimelinePage}
          options={{
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="timeline" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen
          name="Account Info"
          component={AccountInfoPage}
          options={{
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="account-circle" size={size} color={color} />
            ),
          }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;