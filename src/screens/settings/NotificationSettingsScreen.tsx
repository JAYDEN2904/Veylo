import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Switch } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, StyledView, Card } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

const NotificationItem = ({ icon, label, description, value, onValueChange }: any) => (
  <Card className="p-4 mb-3 border-0 shadow-sm">
    <StyledView className="flex-row items-center justify-between">
      <StyledView className="flex-row items-center flex-1">
        <StyledView
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: theme.colors.background,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}
        >
          <Ionicons name={icon} size={20} color={theme.colors.primary} />
        </StyledView>
        <StyledView className="flex-1">
          <Typography className="text-primary font-semibold">{label}</Typography>
          {description && (
            <Typography className="text-gray-500 text-sm mt-0.5">{description}</Typography>
          )}
        </StyledView>
      </StyledView>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.accent }}
        thumbColor="#FFF"
      />
    </StyledView>
  </Card>
);

export const NotificationSettingsScreen = ({ navigation }: any) => {
  const [outfitSuggestions, setOutfitSuggestions] = useState(true);
  const [weatherAlerts, setWeatherAlerts] = useState(true);
  const [newFeatures, setNewFeatures] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [reminders, setReminders] = useState(true);

  return (
    <Screen className="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 100 }}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginBottom: 24, width: 40 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Typography variant="header" className="text-4xl text-primary mb-2">
            Notifications
          </Typography>
          <Typography className="text-gray-500 text-base mb-6">
            Choose what notifications you want to receive
          </Typography>
        </Animated.View>

        {/* Outfit & Style */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <Typography className="text-gray-500 text-xs uppercase tracking-wide mb-3 px-1">
            Outfit & Style
          </Typography>
          <NotificationItem
            icon="flash-outline"
            label="Outfit Suggestions"
            description="Daily AI-powered outfit recommendations"
            value={outfitSuggestions}
            onValueChange={setOutfitSuggestions}
          />
          <NotificationItem
            icon="sunny-outline"
            label="Weather Alerts"
            description="Get notified about weather-appropriate outfits"
            value={weatherAlerts}
            onValueChange={setWeatherAlerts}
          />
        </Animated.View>

        {/* Updates */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Typography className="text-gray-500 text-xs uppercase tracking-wide mb-3 mt-6 px-1">
            Updates
          </Typography>
          <NotificationItem
            icon="rocket-outline"
            label="New Features"
            description="Learn about new Veylo features"
            value={newFeatures}
            onValueChange={setNewFeatures}
          />
          <NotificationItem
            icon="mail-outline"
            label="Weekly Digest"
            description="Summary of your week in style"
            value={weeklyDigest}
            onValueChange={setWeeklyDigest}
          />
        </Animated.View>

        {/* Reminders */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <Typography className="text-gray-500 text-xs uppercase tracking-wide mb-3 mt-6 px-1">
            Reminders
          </Typography>
          <NotificationItem
            icon="time-outline"
            label="Wearing Reminders"
            description="Remind you to wear items you haven't worn in a while"
            value={reminders}
            onValueChange={setReminders}
          />
        </Animated.View>
      </ScrollView>
    </Screen>
  );
};
