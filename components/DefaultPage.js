import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const DefaultPage = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("Login")} // Navigate to Login to add device
      >
        <MaterialIcons name="add" size={100} color="#ccc" />
        <Text style={styles.addButtonText}>Add Device</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  addButton: {
    alignItems: "center",
  },
  addButtonText: {
    fontSize: 18,
    color: "#ccc",
    marginTop: 10,
  },
});

export default DefaultPage;