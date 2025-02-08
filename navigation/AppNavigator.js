import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import * as SecureStore from "expo-secure-store";
import { MaterialIcons } from "@expo/vector-icons";
import Form from "../components/Form";
import ControlPage from "../components/ControlPage";

const Stack = createStackNavigator();

const AppNavigator = () => {
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState("Form");

  useEffect(() => {
    const checkConfig = async () => {
      const config = await SecureStore.getItemAsync("config");
      if (config) {
        setInitialRoute("Control");
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
          component={ControlPage}
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
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;