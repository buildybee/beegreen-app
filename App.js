import React from 'react';
import { NotificationProvider } from './services/notifications';
import { AuthProvider } from './services/auth';
import { MqttProvider } from './services/mqtt';
import AppNavigator from './navigation/AppNavigator';

const App = () => {
  return (
    <AuthProvider>
      <MqttProvider>
        <NotificationProvider>
          <AppNavigator />
        </NotificationProvider>
      </MqttProvider>
    </AuthProvider>
  );
};

export default App;
