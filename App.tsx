import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from 'react-error-boundary';
import { RootNavigator } from './src/navigation';
import { initSentry } from './src/instrument/sentry';
import { RootErrorFallback } from './src/components/RootErrorFallback';
import { NetworkGate } from './src/components/NetworkGate';
import { AppProviders } from './src/providers/AppProviders';

initSentry();

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={RootErrorFallback}>
      <AppProviders>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <NetworkGate>
            <RootNavigator />
          </NetworkGate>
        </SafeAreaProvider>
      </AppProviders>
    </ErrorBoundary>
  );
}
