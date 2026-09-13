import React from 'react';
import { Linking, ScrollView, TouchableOpacity } from 'react-native';
import { Screen, Typography, StyledView } from '../../components/common';
import { useThemeStore } from '../../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';

export const TermsPrivacyScreen = ({ navigation }: { navigation: { goBack: () => void } }) => {
  const { currentTheme } = useThemeStore();

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 60,
          paddingBottom: 100,
        }}
      >
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
          style={{ color: currentTheme.colors.text, fontSize: 28, fontWeight: '700', marginBottom: 16 }}
        >
          Terms & Privacy
        </Typography>
        <StyledView style={{ marginBottom: 24 }}>
          <Typography style={{ color: currentTheme.colors.text, fontWeight: '600', marginBottom: 8 }}>
            Summary
          </Typography>
          <Typography style={{ color: currentTheme.colors.textSecondary, lineHeight: 22 }}>
            Veylo processes your wardrobe photos and preferences to power outfit suggestions, calendar
            planning, and optional try-on features.
          </Typography>
        </StyledView>
        <StyledView style={{ marginBottom: 24 }}>
          <Typography style={{ color: currentTheme.colors.text, fontWeight: '600', marginBottom: 8 }}>
            Data & deletion
          </Typography>
          <Typography style={{ color: currentTheme.colors.textSecondary, lineHeight: 22 }}>
            Use Delete local data in Profile to wipe on-device caches. Delete account removes your
            Supabase user, wardrobe, and stored photos.
          </Typography>
        </StyledView>
        <TouchableOpacity
          onPress={() => {
            void Linking.openURL('https://veylo.com/terms');
          }}
          style={{ minHeight: 44, justifyContent: 'center', marginBottom: 12 }}
        >
          <Typography style={{ color: currentTheme.colors.accent, fontWeight: '600' }}>
            Read Terms of Service
          </Typography>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            void Linking.openURL('https://veylo.com/privacy');
          }}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Typography style={{ color: currentTheme.colors.accent, fontWeight: '600' }}>
            Read Privacy Policy
          </Typography>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
};
