import React, { useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, Alert, Text } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, StyledView, Card, PrimaryButton } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/useAuthStore';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { useOutfitStore } from '../../store/useOutfitStore';
import { useTabScreenPadding } from '../../hooks/useTabScreenPadding';
import { clearLocalAppCaches } from '../../lib/clearLocalData';
import {
  calculateStyleStreak,
  getStyleAchievements,
  type Achievement,
} from '../../services/gamificationService';

const SettingItem = ({ icon, label, value, onPress, showArrow = true, danger = false }: any) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
    <Card className="p-4 mb-3 border-0 shadow-sm">
      <StyledView className="flex-row items-center justify-between">
        <StyledView className="flex-row items-center flex-1">
          <StyledView
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: danger ? '#FEE2E2' : theme.colors.background,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 12,
            }}
          >
            <Ionicons name={icon} size={20} color={danger ? '#EF4444' : theme.colors.primary} />
          </StyledView>
          <StyledView className="flex-1">
            <Typography className="text-primary font-semibold">{label}</Typography>
            {value && <Typography className="text-gray-500 text-sm mt-0.5">{value}</Typography>}
          </StyledView>
        </StyledView>
        {showArrow && (
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        )}
      </StyledView>
    </Card>
  </TouchableOpacity>
);

export const ProfileScreen = ({ navigation }: any) => {
  const tabPad = useTabScreenPadding();
  const { user, logout } = useAuthStore();
  const { items: wardrobeItems } = useWardrobeStore();
  const { outfits } = useOutfitStore();

  const goRoot = (name: string, params?: object) =>
    navigation
      .getParent()
      ?.getParent()
      ?.navigate(name as never, params as never);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const streak = useMemo(() => calculateStyleStreak(outfits), [outfits]);
  const achievements = useMemo(
    () => getStyleAchievements(wardrobeItems, outfits, streak),
    [wardrobeItems, outfits, streak]
  );
  const unlockedBadges = useMemo(
    () => achievements.filter((a) => a.unlocked).slice(0, 4),
    [achievements]
  );
  const nextBadge = useMemo<Achievement | undefined>(
    () => achievements.filter((a) => !a.unlocked).sort((a, b) => b.progress - a.progress)[0],
    [achievements]
  );

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.replace('Auth');
        },
      },
    ]);
  };

  const handleDeleteLocalData = () => {
    Alert.alert(
      'Delete local data',
      'This removes cached wardrobe and settings stored on this device. Cloud data is not removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await clearLocalAppCaches();
            await logout();
            navigation.replace('Auth');
          },
        },
      ]
    );
  };

  return (
    <Screen className="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: tabPad.paddingTop,
          paddingBottom: tabPad.paddingBottom,
        }}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <Typography variant="header" className="text-4xl text-primary mb-6">
            Profile
          </Typography>
        </Animated.View>

        {/* Profile Card */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <Card className="p-6 mb-6 border-0 shadow-lg">
            <StyledView className="items-center">
              <TouchableOpacity
                onPress={() => goRoot('AvatarGeneration')}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: theme.colors.background,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 16,
                  borderWidth: 3,
                  borderColor: theme.colors.secondary,
                  position: 'relative',
                }}
              >
                {user?.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={{ width: 94, height: 94, borderRadius: 47 }}
                  />
                ) : (
                  <Ionicons name="person" size={48} color={theme.colors.textSecondary} />
                )}
                <StyledView
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: theme.colors.primary,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                  }}
                >
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </StyledView>
              </TouchableOpacity>
              <Typography variant="header" className="text-2xl text-primary mb-1">
                {user?.name || 'User'}
              </Typography>
              <Typography className="text-gray-500 text-sm mb-4">
                {user?.email || 'user@example.com'}
              </Typography>
              <PrimaryButton
                title={user?.avatarUrl ? 'Update Avatar' : 'Create Avatar'}
                onPress={() => goRoot('AvatarGeneration')}
                fullWidth={false}
                accessibilityLabel={user?.avatarUrl ? 'Update avatar' : 'Create avatar'}
              />
            </StyledView>
          </Card>
        </Animated.View>

        {/* Style streak + badges */}
        <Animated.View entering={FadeInDown.duration(400).delay(175)}>
          <Typography className="text-gray-500 text-xs uppercase tracking-wide mb-3 px-1">
            Your Style
          </Typography>
          <Card className="p-5 mb-3 border-0 shadow-sm">
            <StyledView className="flex-row items-center">
              <StyledView
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: '#FFEDD5',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16,
                }}
              >
                <Ionicons name="flame" size={28} color="#F97316" />
              </StyledView>
              <StyledView style={{ flex: 1, minWidth: 0 }}>
                <StyledView
                  style={{
                    flexDirection: 'row',
                    alignItems: 'baseline',
                    flexWrap: 'wrap',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 28,
                      fontWeight: '700',
                      color: theme.colors.primary,
                    }}
                  >
                    {streak.currentStreak}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: theme.colors.textSecondary,
                    }}
                  >
                    {` day${streak.currentStreak === 1 ? '' : 's'}`}
                  </Text>
                </StyledView>
                <Typography className="text-gray-500 text-sm">
                  Current streak · Longest {streak.longestStreak}
                </Typography>
              </StyledView>
            </StyledView>
          </Card>

          {unlockedBadges.length > 0 ? (
            <Card className="p-4 mb-3 border-0 shadow-sm">
              <Typography className="text-primary font-semibold mb-3">Badges</Typography>
              <StyledView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {unlockedBadges.map((badge) => (
                  <StyledView
                    key={badge.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: theme.colors.secondary + '22',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 12,
                    }}
                  >
                    <Ionicons
                      name={badge.icon as never}
                      size={16}
                      color={theme.colors.primary}
                      style={{ marginRight: 6 }}
                    />
                    <Typography
                      style={{ fontSize: 13, fontWeight: '600', color: theme.colors.primary }}
                    >
                      {badge.name}
                    </Typography>
                  </StyledView>
                ))}
              </StyledView>
            </Card>
          ) : null}

          {nextBadge ? (
            <Card className="p-4 mb-6 border-0 shadow-sm">
              <StyledView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons
                  name={nextBadge.icon as never}
                  size={18}
                  color={theme.colors.accent}
                  style={{ marginRight: 8 }}
                />
                <Typography className="text-primary font-semibold">{nextBadge.name}</Typography>
              </StyledView>
              <Typography className="text-gray-500 text-xs mb-2">
                {nextBadge.description}
              </Typography>
              <StyledView
                style={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: theme.colors.border,
                  overflow: 'hidden',
                }}
              >
                <StyledView
                  style={{
                    width: `${Math.min(100, Math.max(0, nextBadge.progress))}%`,
                    height: '100%',
                    backgroundColor: theme.colors.accent,
                  }}
                />
              </StyledView>
            </Card>
          ) : null}
        </Animated.View>

        {/* Avatar Section */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Typography className="text-gray-500 text-xs uppercase tracking-wide mb-3 px-1">
            Avatar
          </Typography>
          <SettingItem
            icon="person-circle-outline"
            label={user?.avatarUrl ? 'Update Avatar' : 'Create Avatar'}
            value="Generate your personalized avatar"
            onPress={() => goRoot('AvatarGeneration')}
          />
          <SettingItem
            icon="calendar-outline"
            label="Outfit calendar"
            value="Plan looks by day"
            onPress={() => goRoot('CalendarHome')}
          />
        </Animated.View>

        {/* Settings Sections */}
        <Animated.View entering={FadeInDown.duration(400).delay(250)}>
          <Typography className="text-gray-500 text-xs uppercase tracking-wide mb-3 mt-6 px-1">
            Preferences
          </Typography>
          <SettingItem
            icon="settings-outline"
            label="App Preferences"
            value="Theme, language, and more"
            onPress={() => navigation.navigate('AppPreferences')}
          />
          <SettingItem
            icon="notifications-outline"
            label="Notifications"
            value="Manage your notifications"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
          <SettingItem
            icon="lock-closed-outline"
            label="Privacy & Permissions"
            value="Control your data"
            onPress={() => navigation.navigate('PrivacyPermissions')}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(350)}>
          <Typography className="text-gray-500 text-xs uppercase tracking-wide mb-3 mt-6 px-1">
            Support
          </Typography>
          <SettingItem
            icon="help-circle-outline"
            label="Help Center"
            value="FAQs and support"
            onPress={() => navigation.navigate('HelpCenter')}
          />
          <SettingItem
            icon="information-circle-outline"
            label="About"
            value="Version 1.0.0"
            onPress={() => navigation.navigate('About')}
          />
          <SettingItem
            icon="document-text-outline"
            label="Terms & Privacy"
            value="Summary and data practices"
            onPress={() => navigation.navigate('TermsPrivacy')}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(450)}>
          <Typography className="text-gray-500 text-xs uppercase tracking-wide mb-3 mt-6 px-1">
            Account
          </Typography>
          <SettingItem
            icon="trash-outline"
            label="Delete local data"
            value="Clear on-device cache"
            onPress={handleDeleteLocalData}
            danger
          />
          <SettingItem icon="log-out-outline" label="Sign Out" onPress={handleLogout} danger />
        </Animated.View>
      </ScrollView>
    </Screen>
  );
};
