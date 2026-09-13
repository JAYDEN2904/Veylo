import React, { useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, Alert, Text, TextInput, Modal, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, StyledView, Card, PrimaryButton } from '../../components/common';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/useAuthStore';
import { useWardrobeStore } from '../../store/useWardrobeStore';
import { useOutfitStore } from '../../store/useOutfitStore';
import { useThemeStore } from '../../store/useThemeStore';
import { useTabScreenPadding } from '../../hooks/useTabScreenPadding';
import { clearLocalAppCaches } from '../../lib/clearLocalData';
import { functionsClient } from '../../services/functionsClient';
import { updateProfileName } from '../../services/authService';
import { isSupabaseConfigured } from '../../services/supabase';
import {
  calculateStyleStreak,
  getStyleAchievements,
  type Achievement,
} from '../../services/gamificationService';

const SettingItem = ({ icon, label, value, onPress, showArrow = true, danger = false }: any) => {
  const { currentTheme } = useThemeStore();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={label}>
      <Card style={{ padding: 16, marginBottom: 12 }}>
        <StyledView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <StyledView style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <StyledView
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: danger ? `${currentTheme.colors.error}22` : currentTheme.colors.mutedSurface,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}
            >
              <Ionicons
                name={icon}
                size={20}
                color={danger ? currentTheme.colors.error : currentTheme.colors.primary}
              />
            </StyledView>
            <StyledView style={{ flex: 1 }}>
              <Typography style={{ color: currentTheme.colors.text, fontWeight: '600' }}>{label}</Typography>
              {value ? (
                <Typography style={{ color: currentTheme.colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                  {value}
                </Typography>
              ) : null}
            </StyledView>
          </StyledView>
          {showArrow ? (
            <Ionicons name="chevron-forward" size={20} color={currentTheme.colors.textSecondary} />
          ) : null}
        </StyledView>
      </Card>
    </TouchableOpacity>
  );
};

export const ProfileScreen = ({ navigation }: any) => {
  const tabPad = useTabScreenPadding();
  const { currentTheme } = useThemeStore();
  const { user, logout, updateUser } = useAuthStore();
  const { items: wardrobeItems } = useWardrobeStore();
  const { outfits } = useOutfitStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(user?.name ?? '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const goRoot = (name: string, params?: object) =>
    navigation
      .getParent()
      ?.getParent()
      ?.navigate(name as never, params as never);

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

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          void logout();
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
          onPress: () => {
            void (async () => {
              await clearLocalAppCaches();
              await logout();
            })();
          },
        },
      ]
    );
  };

  const handleSaveName = async () => {
    if (!user?.id) return;
    const nextName = draftName.trim();
    if (!nextName) {
      Alert.alert('Name required', 'Enter a display name to continue.');
      return;
    }
    setIsSavingName(true);
    try {
      await updateProfileName(user.id, nextName);
      await updateUser({ name: nextName });
      setIsEditingName(false);
    } catch (err) {
      if (__DEV__) console.error('[Profile] update name', err);
      Alert.alert('Could not save name', 'Please try again.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This permanently deletes your Veylo account, wardrobe photos, and cloud data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Are you sure?', 'Your closet and outfits will be removed from Veylo servers.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete account',
                style: 'destructive',
                onPress: () => {
                  void (async () => {
                    if (!isSupabaseConfigured()) {
                      await clearLocalAppCaches();
                      await logout();
                      return;
                    }
                    setIsDeletingAccount(true);
                    try {
                      await functionsClient.deleteAccount();
                      await clearLocalAppCaches();
                      await logout();
                    } catch (err) {
                      if (__DEV__) console.error('[Profile] deleteAccount', err);
                      Alert.alert(
                        'Could not delete account',
                        'Sign in again and retry, or email support@veylo.com.'
                      );
                    } finally {
                      setIsDeletingAccount(false);
                    }
                  })();
                },
              },
            ]);
          },
        },
      ]
    );
  };

  return (
    <Screen>
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
          <Typography variant="header" style={{ fontSize: 34, color: currentTheme.colors.text, marginBottom: 24 }}>
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
                  backgroundColor: currentTheme.colors.mutedSurface,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 16,
                  borderWidth: 3,
                  borderColor: currentTheme.colors.secondary,
                  position: 'relative',
                }}
              >
                {user?.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={{ width: 94, height: 94, borderRadius: 47 }}
                  />
                ) : (
                  <Ionicons name="person" size={48} color={currentTheme.colors.textSecondary} />
                )}
                <StyledView
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: currentTheme.colors.primary,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: '#FFFFFF',
                  }}
                >
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </StyledView>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setDraftName(user?.name ?? '');
                  setIsEditingName(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Edit display name"
              >
                <Typography variant="header" style={{ fontSize: 24, color: currentTheme.colors.text, marginBottom: 4 }}>
                  {user?.name || 'User'}
                </Typography>
                <Typography style={{ color: currentTheme.colors.textSecondary, fontSize: 14, marginBottom: 16 }}>
                  {user?.email || 'Add your email'}
                </Typography>
              </TouchableOpacity>
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
                      color: currentTheme.colors.text,
                    }}
                  >
                    {streak.currentStreak}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: currentTheme.colors.textSecondary,
                    }}
                  >
                    {` day${streak.currentStreak === 1 ? '' : 's'}`}
                  </Text>
                </StyledView>
                <Typography style={{ color: currentTheme.colors.textSecondary, fontSize: 14 }}>
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
                      backgroundColor: currentTheme.colors.secondary + '22',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 12,
                    }}
                  >
                    <Ionicons
                      name={badge.icon as never}
                      size={16}
                      color={currentTheme.colors.primary}
                      style={{ marginRight: 6 }}
                    />
                    <Typography
                      style={{ fontSize: 13, fontWeight: '600', color: currentTheme.colors.primary }}
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
                  color={currentTheme.colors.accent}
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
                  backgroundColor: currentTheme.colors.border,
                  overflow: 'hidden',
                }}
              >
                <StyledView
                  style={{
                    width: `${Math.min(100, Math.max(0, nextBadge.progress))}%`,
                    height: '100%',
                    backgroundColor: currentTheme.colors.accent,
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
            icon="color-palette-outline"
            label="Style profile"
            value="Retake the style quiz"
            onPress={() => navigation.navigate('StyleProfileEdit')}
          />
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
          <SettingItem
            icon="person-remove-outline"
            label={isDeletingAccount ? 'Deleting account…' : 'Delete account'}
            value="Permanently remove your Veylo account"
            onPress={isDeletingAccount ? undefined : handleDeleteAccount}
            danger
          />
          <SettingItem icon="log-out-outline" label="Sign Out" onPress={handleLogout} danger />
        </Animated.View>
      </ScrollView>
      <Modal visible={isEditingName} transparent animationType="fade" onRequestClose={() => setIsEditingName(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: currentTheme.colors.overlayStrong,
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: currentTheme.colors.surface,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <Typography style={{ color: currentTheme.colors.text, fontWeight: '700', fontSize: 20, marginBottom: 12 }}>
              Edit name
            </Typography>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Your name"
              placeholderTextColor={currentTheme.colors.iconMuted}
              autoFocus
              style={{
                borderWidth: 1,
                borderColor: currentTheme.colors.border,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                color: currentTheme.colors.text,
                marginBottom: 16,
              }}
            />
            <PrimaryButton title={isSavingName ? 'Saving…' : 'Save'} onPress={() => void handleSaveName()} />
            <TouchableOpacity
              onPress={() => setIsEditingName(false)}
              style={{ marginTop: 12, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
            >
              <Typography style={{ color: currentTheme.colors.textSecondary, fontWeight: '600' }}>Cancel</Typography>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};
