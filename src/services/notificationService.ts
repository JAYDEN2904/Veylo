import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { WeatherData } from '../types';
import { weatherService } from './weatherService';
import { getSupabase, isSupabaseConfigured } from './supabase';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface OutfitReminder {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  type: 'daily' | 'event' | 'weather';
  title: string;
  body: string;
  data?: any;
}

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async (): Promise<boolean> => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

/**
 * Schedule daily outfit reminder
 */
export const scheduleDailyOutfitReminder = async (
  time: string = '08:00'
): Promise<string | null> => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  try {
    const [hours, minutes] = time.split(':').map(Number);

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'What to wear today?',
        body: 'Check out your personalized outfit suggestion for today!',
        data: { type: 'daily_outfit' },
      },
      trigger: {
        hour: hours,
        minute: minutes,
        repeats: true,
      },
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling daily reminder:', error);
    return null;
  }
};

/**
 * Schedule special occasion reminder
 */
export const scheduleEventReminder = async (
  eventTitle: string,
  eventDate: Date,
  reminderHours: number = 24
): Promise<string | null> => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  try {
    const reminderDate = new Date(eventDate);
    reminderDate.setHours(reminderDate.getHours() - reminderHours);

    // Don't schedule if reminder is in the past
    if (reminderDate < new Date()) return null;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Event coming up',
        body: `${eventTitle} is in ${reminderHours} hours. Plan your outfit now!`,
        data: { type: 'event_reminder', eventTitle },
      },
      trigger: reminderDate,
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling event reminder:', error);
    return null;
  }
};

/**
 * Schedule weather-based outfit suggestion
 */
export const scheduleWeatherOutfitSuggestion = async (
  date: Date,
  location?: { latitude: number; longitude: number }
): Promise<string | null> => {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  try {
    // Schedule for morning of the target date
    const notificationDate = new Date(date);
    notificationDate.setHours(8, 0, 0, 0);

    if (notificationDate < new Date()) return null;

    let weatherInfo = '';
    if (location) {
      try {
        const weather = await weatherService.getCurrentWeather(
          location.latitude,
          location.longitude
        );
        if (weather) {
          weatherInfo = `Expect ${weather.condition.toLowerCase()} with ${weather.temperature}°F. `;
        }
      } catch (error) {
        console.log('Could not fetch weather for notification:', error);
      }
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Outfit suggestion for tomorrow',
        body: `${weatherInfo}We've picked the perfect outfit for you!`,
        data: { type: 'weather_outfit', date: date.toISOString() },
      },
      trigger: notificationDate,
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling weather outfit suggestion:', error);
    return null;
  }
};

/**
 * Cancel a scheduled notification
 */
export const cancelNotification = async (notificationId: string): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
};

/**
 * Cancel all notifications
 */
export const cancelAllNotifications = async (): Promise<void> => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling all notifications:', error);
  }
};

/**
 * Get all scheduled notifications
 */
export const getScheduledNotifications = async (): Promise<Notifications.NotificationRequest[]> => {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
};

/**
 * Register this device's Expo push token for the current authenticated user.
 * Safe to call multiple times — idempotent via upsert on `push_tokens`.
 * Returns the token on success, or null if skipped (simulator, missing perms, unconfigured).
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  if (!isSupabaseConfigured()) return null;
  if (!Device.isDevice) return null;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResponse.data;
    if (!token) return null;

    const supabase = getSupabase();
    if (!supabase) return token;
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id;
    if (!uid) return token;

    const platform: 'ios' | 'android' | 'web' =
      Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
    const { error } = await supabase
      .from('push_tokens')
      .upsert({ user_id: uid, token, platform }, { onConflict: 'token' });
    if (error && __DEV__) console.error('[push_tokens] upsert', error);
    return token;
  } catch (err) {
    if (__DEV__) console.error('[registerForPushNotifications]', err);
    return null;
  }
};
