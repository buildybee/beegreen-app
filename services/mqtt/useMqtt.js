import { useContext } from 'react';
import { MqttContext } from './MqttContext';

export const useMqtt = () => {
  const context = useContext(MqttContext);

  if (context === null) {
    throw new Error('useMqtt must be used within an MqttProvider.');
  }

  return context;
};

export default useMqtt;
