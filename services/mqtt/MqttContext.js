import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Paho from 'paho-mqtt';
import { useAuth } from '../auth';

export const MqttContext = createContext(null);

export const MqttProvider = ({ children }) => {
  const { isAuthenticated, config } = useAuth();
  const clientRef = useRef(null);
  const messageHandlersRef = useRef(new Set());
  const [client, setClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const mqttServer = config?.mqttServer;
  const mqttPort = config?.mqttPort;
  const mqttUser = config?.mqttUser;
  const mqttPassword = config?.mqttPassword;

  const addMessageListener = useCallback(listener => {
    if (typeof listener !== 'function') {
      throw new Error('MQTT message listener must be a function');
    }

    messageHandlersRef.current.add(listener);
    return () => messageHandlersRef.current.delete(listener);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !mqttServer) {
      return undefined;
    }

    const mqttClient = new Paho.Client(
      mqttServer,
      Number(mqttPort) || 8884,
      `beegreen-${Math.random().toString(36).slice(2, 10)}`
    );

    clientRef.current = mqttClient;

    mqttClient.onMessageArrived = message => {
      messageHandlersRef.current.forEach(listener => {
        try {
          listener(message);
        } catch (error) {
          console.error('MQTT message listener failed:', error);
        }
      });
    };

    mqttClient.onConnectionLost = responseObject => {
      if (clientRef.current !== mqttClient) return;

      setIsConnected(false);
      if (responseObject.errorCode !== 0) {
        console.log('MQTT connection lost:', responseObject.errorMessage);
      }
    };

    mqttClient.connect({
      onSuccess: () => {
        if (clientRef.current === mqttClient) {
          setClient(mqttClient);
          setIsConnected(true);
          console.log('MQTT connected');
        }
      },
      onFailure: error => {
        if (clientRef.current === mqttClient) {
          setIsConnected(false);
          console.error('MQTT connection failed:', error);
        }
      },
      useSSL: true,
      userName: mqttUser,
      password: mqttPassword,
      reconnect: true,
      keepAliveInterval: 30,
    });

    return () => {
      if (clientRef.current === mqttClient) {
        clientRef.current = null;
        setClient(null);
        setIsConnected(false);
      }

      if (mqttClient.isConnected()) {
        mqttClient.disconnect();
      }
    };
  }, [isAuthenticated, mqttPassword, mqttPort, mqttServer, mqttUser]);

  const contextValue = useMemo(
    () => ({
      client,
      isConnected,
      addMessageListener,
    }),
    [addMessageListener, client, isConnected]
  );

  return <MqttContext.Provider value={contextValue}>{children}</MqttContext.Provider>;
};

export default MqttProvider;
