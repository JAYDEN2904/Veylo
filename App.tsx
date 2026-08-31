import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from 'react-error-boundary';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { RootNavigator } from './src/navigation';
import { initSentry } from './src/instrument/sentry';
import { RootErrorFallback } from './src/components/RootErrorFallback';
import { NetworkGate } from './src/components/NetworkGate';
import { AppProviders } from './src/providers/AppProviders';

initSentry();

void SplashScreen.preventAutoHideAsync().catch(() => {
  /* Splash may already be hidden in some environments */
});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      setAppReady(true);
    }
  }, [fontsLoaded, fontError]);

  const onLayoutRootView = useCallback(async () => {
    if (appReady) {
      await SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [appReady]);

  if (!appReady) {
    return null;
  }

  return (
    <ErrorBoundary FallbackComponent={RootErrorFallback}>
      <AppProviders>
        <SafeAreaProvider onLayout={onLayoutRootView}>
          <StatusBar style="auto" />
          <NetworkGate>
            <RootNavigator />
          </NetworkGate>
        </SafeAreaProvider>
      </AppProviders>
    </ErrorBoundary>
  );
}
