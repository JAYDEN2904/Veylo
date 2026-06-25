import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Linking } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen, Typography, StyledView, Card } from '../../components/common';
import { theme } from '../../theme';
import { Ionicons } from '@expo/vector-icons';

const FAQ_ITEMS = [
  {
    id: '1',
    question: 'How do I scan items into my closet?',
    answer:
      'Use the camera button in the bottom navigation to access the scanner. Point your camera at a clothing item and tap to capture. Our AI will automatically detect and categorize it.',
  },
  {
    id: '2',
    question: 'Can I edit item details after scanning?',
    answer:
      'Yes! Tap on any item in your closet to view details, then tap the edit button to modify category, tags, colors, or any other information.',
  },
  {
    id: '3',
    question: 'How does the AI outfit generator work?',
    answer:
      'Our AI analyzes your wardrobe, current weather, and your style preferences to suggest perfect outfit combinations. Tap the "Generate Outfit" button to get started.',
  },
  {
    id: '4',
    question: 'Is my data secure?',
    answer:
      'Absolutely. All your data is encrypted and stored securely. We never share your information with third parties. You can read more in our Privacy Policy.',
  },
];

const HelpItem = ({ icon, label, description, onPress, color }: any) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
    <Card className="p-4 mb-3 border-0 shadow-sm">
      <StyledView className="flex-row items-center">
        <StyledView
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: color + '20',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 16,
          }}
        >
          <Ionicons name={icon} size={24} color={color} />
        </StyledView>
        <StyledView className="flex-1">
          <Typography className="text-primary font-semibold text-base">{label}</Typography>
          {description && (
            <Typography className="text-gray-500 text-sm mt-1">{description}</Typography>
          )}
        </StyledView>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </StyledView>
    </Card>
  </TouchableOpacity>
);

const FAQItem = ({ item, isExpanded, onToggle }: any) => (
  <Card className="p-4 mb-3 border-0 shadow-sm">
    <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
      <StyledView className="flex-row items-center justify-between">
        <Typography className="text-primary font-semibold flex-1 pr-4">{item.question}</Typography>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={theme.colors.primary}
        />
      </StyledView>
    </TouchableOpacity>
    {isExpanded && (
      <Animated.View entering={FadeInDown.duration(300)}>
        <Typography className="text-gray-600 text-sm mt-3 leading-5">{item.answer}</Typography>
      </Animated.View>
    )}
  </Card>
);

export const HelpCenterScreen = ({ navigation }: any) => {
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

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
            Help Center
          </Typography>
          <Typography className="text-gray-500 text-base mb-6">
            Get help and find answers
          </Typography>
        </Animated.View>

        {/* Quick Help */}
        <Animated.View entering={FadeInDown.duration(400).delay(100)}>
          <Typography className="text-gray-500 text-xs uppercase tracking-wide mb-3 px-1">
            Quick Help
          </Typography>
          <HelpItem
            icon="mail-outline"
            label="Contact Support"
            description="Get in touch with our team"
            onPress={() => Linking.openURL('mailto:support@veylo.com')}
            color={theme.colors.accent}
          />
          <HelpItem
            icon="document-text-outline"
            label="User Guide"
            description="Learn how to use Veylo"
            onPress={() => {}}
            color={theme.colors.secondary}
          />
          <HelpItem
            icon="chatbubbles-outline"
            label="Community Forum"
            description="Connect with other users"
            onPress={() => {}}
            color="#10B981"
          />
        </Animated.View>

        {/* FAQs */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <Typography className="text-gray-500 text-xs uppercase tracking-wide mb-3 mt-6 px-1">
            Frequently Asked Questions
          </Typography>
          {FAQ_ITEMS.map((item) => (
            <FAQItem
              key={item.id}
              item={item}
              isExpanded={expandedFAQ === item.id}
              onToggle={() => toggleFAQ(item.id)}
            />
          ))}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
};
