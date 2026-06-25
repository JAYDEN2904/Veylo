import React from 'react';
import { ScrollView } from 'react-native';
import { Screen, Typography, StyledView } from '../../components/common';
import { theme } from '../../theme';
import { useTabScreenPadding } from '../../hooks/useTabScreenPadding';

export const TermsPrivacyScreen = () => {
  const tabPad = useTabScreenPadding();
  return (
    <Screen className="bg-background">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: tabPad.paddingTop,
          paddingBottom: tabPad.paddingBottom,
        }}
      >
        <Typography variant="header" className="text-2xl text-primary mb-4">
          Terms & Privacy
        </Typography>
        <StyledView style={{ marginBottom: 24 }}>
          <Typography className="text-primary font-semibold mb-2">Summary</Typography>
          <Typography style={{ color: theme.colors.textSecondary, lineHeight: 22 }}>
            Veylo processes your wardrobe photos and preferences to power outfit suggestions,
            calendar planning, and optional try-on features. Host your full legal documents on a
            public URL and link them here before App Store submission.
          </Typography>
        </StyledView>
        <StyledView style={{ marginBottom: 24 }}>
          <Typography className="text-primary font-semibold mb-2">Data & deletion</Typography>
          <Typography style={{ color: theme.colors.textSecondary, lineHeight: 22 }}>
            Use “Delete local data” in Profile to wipe on-device caches. Account and cloud data
            removal should call a Supabase Edge Function with service role to cascade-delete by user
            id (required for Apple App Store privacy expectations).
          </Typography>
        </StyledView>
      </ScrollView>
    </Screen>
  );
};
