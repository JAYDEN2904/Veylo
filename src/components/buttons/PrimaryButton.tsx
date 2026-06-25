import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/useThemeStore';

export interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Canonical primary action button: 56px tall, 28px radius, fill = primary color.
 * Reads colors from useThemeStore so it flips automatically in dark mode.
 */
export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  loading,
  disabled,
  icon,
  fullWidth = true,
  accessibilityLabel,
  style,
  textStyle,
}) => {
  const { currentTheme } = useThemeStore();
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!isDisabled }}
      style={[
        {
          height: 56,
          borderRadius: 28,
          paddingHorizontal: 24,
          backgroundColor: currentTheme.colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          alignSelf: fullWidth ? 'stretch' : 'center',
          opacity: isDisabled ? 0.55 : 1,
          shadowColor: currentTheme.colors.shadow ?? '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18,
          shadowRadius: 14,
          elevation: 4,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={currentTheme.colors.onPrimary} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {icon ? (
            <Ionicons
              name={icon}
              size={20}
              color={currentTheme.colors.onPrimary}
              style={{ marginRight: 8 }}
            />
          ) : null}
          <Text
            style={[
              {
                color: currentTheme.colors.onPrimary,
                fontSize: 17,
                fontWeight: '600',
                letterSpacing: 0.2,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
