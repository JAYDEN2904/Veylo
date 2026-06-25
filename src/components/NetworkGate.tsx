import React, { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { OfflineScreen } from '../screens/system/OfflineScreen';

interface Props {
  children: React.ReactNode;
}

/**
 * When the device has no network, shows {@link OfflineScreen} instead of children.
 */
export function NetworkGate({ children }: Props) {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!(state.isConnected ?? false));
    });
    void NetInfo.fetch().then((state) => {
      setIsOffline(!(state.isConnected ?? false));
    });
    return () => unsubscribe();
  }, []);

  if (isOffline) {
    return <OfflineScreen />;
  }

  return <>{children}</>;
}
