import React, { useState } from 'react';
import { Appearance, ScrollView, TouchableOpacity, Switch } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, StyledView, Card } from '../../components/common';
import { useThemeStore } from '../../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';

interface PreferenceItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}

const PreferenceItem = ({
  icon,
  label,
  description,
  value,
  onValueChange,
}: PreferenceItemProps) => {
  const { currentTheme } = useThemeStore();
  return (
    <Card style={{ marginBottom: 12 }}>
      <StyledView
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
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
            <Typography
              style={{ color: currentTheme.colors.text, fontWeight: '600', fontSize: 15 }}
            >
              {label}
            </Typography>
            {description ? (
              <Typography
                style={{
                  color: currentTheme.colors.textSecondary,
                  fontSize: 13,
                  marginTop: 2,
                }}
              >
                {description}
              </Typography>
            ) : null}
          </StyledView>
        </StyledView>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: currentTheme.colors.border, true: currentTheme.colors.accent }}
          thumbColor="#FFF"
        />
      </StyledView>
    </Card>
  );
};

export const AppPreferencesScreen = ({ navigation }: { navigation: { goBack: () => void } }) => {
  const { mode, setMode, currentTheme } = useThemeStore();
  const systemScheme = Appearance.getColorScheme();
  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const [analytics, setAnalytics] = useState(true);
  const [crashReports, setCrashReports] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);

  const handleToggleDark = (next: boolean) => {
    setMode(next ? 'dark' : 'light');
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 100 }}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginBottom: 24, width: 40 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={currentTheme.colors.text} />
          </TouchableOpacity>
          <Typography
            variant="header"
            style={{
              color: currentTheme.colors.text,
              fontSize: 34,
              fontWeight: '700',
              marginBottom: 4,
            }}
          >
            App Preferences
          </Typography>
          <Typography
            style={{ color: currentTheme.colors.textSecondary, fontSize: 16, marginBottom: 24 }}
          >
            Customize your Veylo experience
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
              paddingHorizontal: 4,
            }}
          >
            Appearance
          </Typography>
          <PreferenceItem
            icon="moon-outline"
            label="Dark Mode"
            description="Switch to dark theme"
            value={isDark}
            onValueChange={handleToggleDark}
          />
          <PreferenceItem
            icon="phone-portrait-outline"
            label="Match System"
            description="Follow iOS / Android appearance setting"
            value={mode === 'system'}
            onValueChange={(next) => setMode(next ? 'system' : isDark ? 'dark' : 'light')}
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
              paddingHorizontal: 4,
            }}
          >
            Data & Storage
          </Typography>
          <PreferenceItem
            icon="cloud-upload-outline"
            label="Auto Backup"
            description="Automatically backup your closet"
            value={autoBackup}
            onValueChange={setAutoBackup}
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
              paddingHorizontal: 4,
            }}
          >
            Privacy
          </Typography>
          <PreferenceItem
            icon="analytics-outline"
            label="Analytics"
            description="Help improve Veylo"
            value={analytics}
            onValueChange={setAnalytics}
          />
          <PreferenceItem
            icon="bug-outline"
            label="Crash Reports"
            description="Send crash reports automatically"
            value={crashReports}
            onValueChange={setCrashReports}
          />
        </Animated.View>
      </ScrollView>
    </Screen>
  );
};
