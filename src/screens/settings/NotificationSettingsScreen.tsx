import React from 'react';
import { ScrollView, TouchableOpacity, Switch } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, StyledView, Card } from '../../components/common';
import { useThemeStore } from '../../store/useThemeStore';
import { useAppSettingsStore } from '../../store/useAppSettingsStore';
import { Ionicons } from '@expo/vector-icons';

const NotificationItem = ({
  icon,
  label,
  description,
  value,
  onValueChange,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) => {
  const { currentTheme } = useThemeStore();
  return (
    <Card style={{ marginBottom: 12, padding: 16 }}>
      <StyledView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <StyledView style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <StyledView
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: currentTheme.colors.mutedSurface,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <Ionicons name={icon} size={20} color={currentTheme.colors.primary} />
          </StyledView>
          <StyledView style={{ flex: 1 }}>
            <Typography style={{ color: currentTheme.colors.text, fontWeight: '600' }}>{label}</Typography>
            {description ? (
              <Typography style={{ color: currentTheme.colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                {description}
              </Typography>
            ) : null}
          </StyledView>
        </StyledView>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: currentTheme.colors.border, true: currentTheme.colors.accent }}
          thumbColor={currentTheme.colors.surface}
        />
      </StyledView>
    </Card>
  );
};

export const NotificationSettingsScreen = ({ navigation }: { navigation: { goBack: () => void } }) => {
  const { currentTheme } = useThemeStore();
  const {
    outfitSuggestions,
    weatherAlerts,
    newFeatures,
    weeklyDigest,
    wearingReminders,
    setOutfitSuggestions,
    setWeatherAlerts,
    setNewFeatures,
    setWeeklyDigest,
    setWearingReminders,
  } = useAppSettingsStore();

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 100 }}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginBottom: 24, width: 44, minHeight: 44 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
          <Typography
            variant="header"
            style={{ color: currentTheme.colors.text, fontSize: 34, fontWeight: '700', marginBottom: 8 }}
          >
            Notifications
          </Typography>
          <Typography style={{ color: currentTheme.colors.textSecondary, fontSize: 16, marginBottom: 24 }}>
            Choose what Veylo can remind you about
          </Typography>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <Typography
            style={{
              color: currentTheme.colors.textSecondary,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            Outfit & Style
          </Typography>
          <NotificationItem
            icon="flash-outline"
            label="Outfit Suggestions"
            description="Daily outfit reminder on this device"
            value={outfitSuggestions}
            onValueChange={(next) => {
              void setOutfitSuggestions(next);
            }}
          />
          <NotificationItem
            icon="sunny-outline"
            label="Weather Alerts"
            description="Weather-aware outfit prompts when available"
            value={weatherAlerts}
            onValueChange={setWeatherAlerts}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Typography
            style={{
              color: currentTheme.colors.textSecondary,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 12,
              marginTop: 24,
            }}
          >
            Updates
          </Typography>
          <NotificationItem
            icon="rocket-outline"
            label="New Features"
            description="Product updates from Veylo"
            value={newFeatures}
            onValueChange={setNewFeatures}
          />
          <NotificationItem
            icon="mail-outline"
            label="Weekly Digest"
            description="A weekly style summary when available"
            value={weeklyDigest}
            onValueChange={setWeeklyDigest}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <Typography
            style={{
              color: currentTheme.colors.textSecondary,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 12,
              marginTop: 24,
            }}
          >
            Reminders
          </Typography>
          <NotificationItem
            icon="time-outline"
            label="Wearing Reminders"
            description="Nudge you to wear neglected items"
            value={wearingReminders}
            onValueChange={(next) => {
              void setWearingReminders(next);
            }}
          />
        </Animated.View>
      </ScrollView>
    </Screen>
  );
};
