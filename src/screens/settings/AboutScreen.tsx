import React from 'react';
import { ScrollView, TouchableOpacity, Linking } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, StyledView, Card } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const LinkItem = ({ icon, label, onPress }: any) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
    <Card className="p-4 mb-3 border-0 shadow-sm">
      <StyledView className="flex-row items-center justify-between">
        <StyledView className="flex-row items-center flex-1">
          <Ionicons
            name={icon}
            size={24}
            color={theme.colors.primary}
            style={{ marginRight: 16 }}
          />
          <Typography className="text-primary font-semibold">{label}</Typography>
        </StyledView>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </StyledView>
    </Card>
  </TouchableOpacity>
);

export const AboutScreen = ({ navigation }: any) => {
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
            About
          </Typography>
        </Animated.View>

        {/* App Logo/Info */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <Card className="p-8 mb-6 border-0 shadow-lg">
            <StyledView className="items-center">
              <LinearGradient
                colors={[theme.colors.primary, '#2A2D31']}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 24,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 24,
                }}
              >
                <Typography
                  variant="header"
                  className="text-4xl text-secondary"
                  style={{ fontWeight: '700' }}
                >
                  V
                </Typography>
              </LinearGradient>
              <Typography variant="header" className="text-3xl text-primary mb-2">
                Veylo
              </Typography>
              <Typography className="text-gray-500 text-sm mb-4">Smart Closet</Typography>
              <Typography className="text-gray-400 text-xs">Version 1.0.0</Typography>
            </StyledView>
          </Card>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Card
            className="p-5 mb-6 border-0 shadow-sm"
            style={{ backgroundColor: theme.colors.background }}
          >
            <Typography className="text-gray-700 text-sm leading-6 text-center">
              Veylo is a premium AI-powered smart closet app that helps you organize, style, and
              manage your wardrobe with ease. Discover your personal style, get outfit suggestions,
              and make sustainable fashion choices.
            </Typography>
          </Card>
        </Animated.View>

        {/* Links */}
        <Animated.View entering={FadeInDown.duration(400).delay(300)}>
          <Typography className="text-gray-500 text-xs uppercase tracking-wide mb-3 px-1">
            Legal
          </Typography>
          <LinkItem
            icon="document-text-outline"
            label="Terms of Service"
            onPress={() => Linking.openURL('https://veylo.com/terms')}
          />
          <LinkItem
            icon="shield-checkmark-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://veylo.com/privacy')}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(400)}>
          <Typography className="text-gray-500 text-xs uppercase tracking-wide mb-3 mt-6 px-1">
            Connect
          </Typography>
          <LinkItem
            icon="logo-twitter"
            label="Twitter"
            onPress={() => Linking.openURL('https://twitter.com/veylo')}
          />
          <LinkItem
            icon="logo-instagram"
            label="Instagram"
            onPress={() => Linking.openURL('https://instagram.com/veylo')}
          />
          <LinkItem
            icon="mail-outline"
            label="Contact Us"
            onPress={() => Linking.openURL('mailto:hello@veylo.com')}
          />
        </Animated.View>

        {/* Copyright */}
        <Animated.View entering={FadeInDown.duration(400).delay(500)}>
          <Typography className="text-gray-400 text-xs text-center mt-8">
            © 2024 Veylo. All rights reserved.
          </Typography>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
};
