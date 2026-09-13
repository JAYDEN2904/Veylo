import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Linking } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, StyledView, Card } from '../../components/common';
import { useThemeStore } from '../../store/useThemeStore';
import { Ionicons } from '@expo/vector-icons';

const FAQ_ITEMS = [
  {
    id: '1',
    question: 'How do I scan items into my closet?',
    answer:
      'Tap the camera button in the tab bar. Take a photo of one garment, or import up to 10 photos from your library. Veylo tags each item, then you can review and save it.',
  },
  {
    id: '2',
    question: 'Can I edit item details after scanning?',
    answer:
      'Yes. Open any item in your closet, tap Edit Item to change category, colors, tags, or notes, or Change Photo to replace the image.',
  },
  {
    id: '3',
    question: 'How does the AI outfit generator work?',
    answer:
      'Veylo scores complete outfits from your closet using weather, occasion, and your style preferences. Open Outfits and tap Generate Outfit to start.',
  },
  {
    id: '4',
    question: 'Is my data secure?',
    answer:
      'Your wardrobe photos and profile live in your Veylo account. You can clear on-device caches or delete your cloud account from Profile.',
  },
];

export const HelpCenterScreen = ({ navigation }: { navigation: { goBack: () => void } }) => {
  const { currentTheme } = useThemeStore();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const helpItems: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    description: string;
    onPress: () => void;
  }> = [
    {
      icon: 'mail-outline',
      label: 'Contact Support',
      description: 'Email the Veylo team',
      onPress: () => {
        void Linking.openURL('mailto:support@veylo.com');
      },
    },
    {
      icon: 'document-text-outline',
      label: 'User Guide',
      description: 'Scan, tag, and generate outfits',
      onPress: () => {
        void Linking.openURL('https://veylo.com');
      },
    },
    {
      icon: 'chatbubbles-outline',
      label: 'Community',
      description: 'Follow Veylo for updates',
      onPress: () => {
        void Linking.openURL('https://instagram.com/veylo');
      },
    },
  ];

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
            Help Center
          </Typography>
          <Typography style={{ color: currentTheme.colors.textSecondary, fontSize: 16, marginBottom: 24 }}>
            Get help and find answers
          </Typography>
        </Animated.View>

        {helpItems.map((item) => (
          <TouchableOpacity key={item.label} onPress={item.onPress} activeOpacity={0.7}>
            <Card style={{ padding: 16, marginBottom: 12 }}>
              <StyledView style={{ flexDirection: 'row', alignItems: 'center' }}>
                <StyledView
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: currentTheme.colors.mutedSurface,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 16,
                  }}
                >
                  <Ionicons name={item.icon} size={24} color={currentTheme.colors.accent} />
                </StyledView>
                <StyledView style={{ flex: 1 }}>
                  <Typography style={{ color: currentTheme.colors.text, fontWeight: '600', fontSize: 16 }}>
                    {item.label}
                  </Typography>
                  <Typography style={{ color: currentTheme.colors.textSecondary, fontSize: 13, marginTop: 4 }}>
                    {item.description}
                  </Typography>
                </StyledView>
                <Ionicons name="chevron-forward" size={20} color={currentTheme.colors.textSecondary} />
              </StyledView>
            </Card>
          </TouchableOpacity>
        ))}

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
          Frequently Asked Questions
        </Typography>
        {FAQ_ITEMS.map((item) => {
          const isExpanded = expandedFAQ === item.id;
          return (
            <Card key={item.id} style={{ padding: 16, marginBottom: 12 }}>
              <TouchableOpacity
                onPress={() => setExpandedFAQ(isExpanded ? null : item.id)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={item.question}
              >
                <StyledView style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography style={{ color: currentTheme.colors.text, fontWeight: '600', flex: 1, paddingRight: 16 }}>
                    {item.question}
                  </Typography>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={currentTheme.colors.primary}
                  />
                </StyledView>
              </TouchableOpacity>
              {isExpanded ? (
                <Animated.View entering={FadeInDown.duration(300)}>
                  <Typography
                    style={{ color: currentTheme.colors.textSecondary, fontSize: 14, marginTop: 12, lineHeight: 20 }}
                  >
                    {item.answer}
                  </Typography>
                </Animated.View>
              ) : null}
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
};
