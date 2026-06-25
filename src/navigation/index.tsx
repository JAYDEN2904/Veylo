import React from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../store/useAuthStore';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { RootStackParamList } from './types';

const Stack = createStackNavigator<RootStackParamList>();

// Maps an incoming notification response payload into a deep link URL.
// notificationService schedules pushes with data.type = 'daily_outfit'; tapping
// those pushes should land the user on TodayScreen.
const urlFromNotification = (
  response: Notifications.NotificationResponse | null | undefined
): string | null => {
  const data = response?.notification?.request?.content?.data as
    | { type?: string; url?: string }
    | undefined;
  if (!data) return null;
  if (typeof data.url === 'string' && data.url.length > 0) return data.url;
  if (data.type === 'daily_outfit') return 'veylo://today';
  if (data.type === 'weather_outfit') return 'veylo://today';
  return null;
};

// Maps incoming push payloads + universal links into the navigation tree.
// `veylo://today` opens TodayScreen inside TodayStack, which lives in MainTabs.
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['veylo://', Linking.createURL('/')],
  config: {
    screens: {
      App: {
        screens: {
          MainTabs: {
            screens: {
              TodayStack: {
                screens: {
                  Today: 'today',
                  WardrobeHome: 'wardrobe',
                },
              },
              OutfitsStack: {
                screens: {
                  OutfitHome: 'outfits',
                },
              },
              FeedStack: {
                screens: {
                  StyleFeed: 'feed',
                },
              },
              ProfileStack: {
                screens: {
                  Profile: 'profile',
                },
              },
            },
          },
        },
      },
    },
  },
  async getInitialURL() {
    const url = await Linking.getInitialURL();
    if (url) return url;
    const response = await Notifications.getLastNotificationResponseAsync();
    return urlFromNotification(response);
  },
  subscribe(listener) {
    const linkSub = Linking.addEventListener('url', ({ url }) => listener(url));
    const notifSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = urlFromNotification(response);
      if (url) listener(url);
    });
    return () => {
      linkSub.remove();
      notifSub.remove();
    };
  },
};

export const RootNavigator = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="App" component={AppNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
