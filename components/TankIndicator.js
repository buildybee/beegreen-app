/**
 * TankIndicator - Reusable water tank status indicator component
 * 
 * Displays the water tank status (EMPTY / NOT EMPTY) with visual indicator.
 * Used across multiple pages: DevicePage, ControlPage, SchedulerPage
 * 
 * Props:
 * - isEmpty: boolean - true if tank is empty, false if not empty
 * - showLabel: boolean - whether to show text label (default: true)
 * - size: 'small' | 'medium' | 'large' - indicator size (default: 'medium')
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const TankIndicator = ({ isEmpty, showLabel = true, size = 'medium' }) => {
  // Determine icon, color, and label based on isEmpty state
  const getIndicatorConfig = () => {
    if (isEmpty === null || isEmpty === undefined) {
      return {
        icon: 'help-outline',
        color: '#9CA3AF',
        label: 'UNKNOWN',
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
      };
    }

    if (isEmpty) {
      return {
        icon: 'water-off',
        color: '#F44336',
        label: 'EMPTY',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
      };
    }

    return {
      icon: 'water',
      color: '#4CAF50',
      label: 'NOT EMPTY',
      backgroundColor: 'rgba(76, 175, 80, 0.1)',
    };
  };

  const config = getIndicatorConfig();

  // Get dimensions based on size
  const getDimensions = () => {
    switch (size) {
      case 'small':
        return { iconSize: 16, padding: 6, fontSize: 10 };
      case 'large':
        return { iconSize: 28, padding: 10, fontSize: 14 };
      case 'medium':
      default:
        return { iconSize: 20, padding: 8, fontSize: 12 };
    }
  };

  const dims = getDimensions();

  return (
    <View style={[
      styles.container,
      { backgroundColor: config.backgroundColor, padding: dims.padding }
    ]}>
      <MaterialIcons
        name={config.icon}
        size={dims.iconSize}
        color={config.color}
        style={styles.icon}
      />
      {showLabel && (
        <Text style={[
          styles.label,
          { color: config.color, fontSize: dims.fontSize }
        ]}>
          {config.label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default TankIndicator;
