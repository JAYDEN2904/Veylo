import React from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type TouchableOpacityProps,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { styled } from 'nativewind';
import { twMerge } from 'tailwind-merge';

import { Fonts, frauncesForWeight, interForWeight } from '../theme/fonts';
import { useThemeStore } from '../store/useThemeStore';

const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);

export const StyledView = styled(View);
export const StyledTouchableOpacity = styled(TouchableOpacity);
export const StyledImage = styled(Image);

export type ScreenProps = ViewProps & {
  className?: string;
};

export function Screen({ children, className, style, ...rest }: ScreenProps) {
  const { currentTheme } = useThemeStore();
  return (
    <StyledView
      className={twMerge('flex-1', className)}
      style={[{ backgroundColor: currentTheme.colors.background }, style]}
      {...rest}
    >
      {children}
    </StyledView>
  );
}

export type TypographyProps = TextProps & {
  variant?: 'header' | 'body' | 'secondary';
  /** Explicit weight token — maps to the matching Inter/Fraunces file. */
  weight?: '400' | '500' | '600' | '700' | '800';
  className?: string;
};

function resolveTypographyFont(
  variant: 'header' | 'body' | 'secondary',
  weight: TypographyProps['weight'] | undefined,
  styleFontWeight: TextStyle['fontWeight'] | undefined
): { fontFamily: string; fontWeight: TextStyle['fontWeight'] } {
  const resolvedWeight =
    weight ?? (typeof styleFontWeight === 'string' ? styleFontWeight : undefined);
  if (variant === 'header') {
    return {
      fontFamily: frauncesForWeight(resolvedWeight ?? '700'),
      // Loaded faces already encode weight; keep RN from trying to synthesize.
      fontWeight: '400',
    };
  }
  return {
    fontFamily: interForWeight(resolvedWeight ?? (variant === 'secondary' ? '400' : '400')),
    fontWeight: '400',
  };
}

export function Typography({
  variant = 'body',
  weight,
  className,
  style,
  ...rest
}: TypographyProps) {
  const flat = (Array.isArray(style) ? Object.assign({}, ...style.flat(2)) : style) as
    | TextStyle
    | undefined;
  const mapped = resolveTypographyFont(variant, weight, flat?.fontWeight);
  const variantClass =
    variant === 'header' ? 'font-bold' : variant === 'secondary' ? '' : '';

  return (
    <StyledText
      className={twMerge(variantClass, className)}
      style={[{ fontFamily: mapped.fontFamily, fontWeight: mapped.fontWeight }, style]}
      {...rest}
    />
  );
}

export type ButtonProps = TouchableOpacityProps & {
  title: string;
  variant?: 'primary' | 'outline' | 'secondary' | 'ghost';
  loading?: boolean;
  className?: string;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled,
  className,
  style,
  activeOpacity = 0.85,
  ...rest
}: ButtonProps) {
  const { currentTheme } = useThemeStore();
  const isDisabled = disabled ?? loading;

  const containerClass = 'rounded-xl py-4 px-6 items-center justify-center min-h-[48px]';
  const containerStyle =
    variant === 'outline'
      ? { borderWidth: 2, borderColor: currentTheme.colors.accent, backgroundColor: 'transparent' }
      : variant === 'secondary'
        ? { backgroundColor: currentTheme.colors.secondary }
        : variant === 'ghost'
          ? { backgroundColor: 'transparent' }
          : { backgroundColor: currentTheme.colors.accent };

  const titleColor =
    variant === 'outline'
      ? currentTheme.colors.accent
      : variant === 'secondary'
        ? currentTheme.colors.primary
        : variant === 'ghost'
          ? currentTheme.colors.error
          : currentTheme.colors.onPrimary;

  const spinnerColor = titleColor;

  return (
    <StyledTouchableOpacity
      accessibilityRole="button"
      activeOpacity={activeOpacity}
      className={twMerge(containerClass, className)}
      disabled={isDisabled}
      onPress={onPress}
      style={[containerStyle, { opacity: isDisabled ? 0.55 : 1 }, style]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <StyledText
          style={{
            fontFamily: Fonts.bodySemiBold,
            fontWeight: '400',
            fontSize: 16,
            color: titleColor,
          }}
        >
          {title}
        </StyledText>
      )}
    </StyledTouchableOpacity>
  );
}

export type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  className?: string;
};

export function Input({ label, error, className, ...rest }: InputProps) {
  const { currentTheme } = useThemeStore();
  const inputClass = twMerge('border rounded-xl px-4 py-3 text-base', error ? 'border-error' : '');

  return (
    <StyledView className={twMerge('w-full', className)}>
      {label ? (
        <StyledText
          style={{
            fontFamily: Fonts.bodyMedium,
            fontWeight: '400',
            fontSize: 14,
            color: currentTheme.colors.text,
            marginBottom: 8,
          }}
        >
          {label}
        </StyledText>
      ) : null}
      <StyledTextInput
        className={inputClass}
        placeholderTextColor={currentTheme.colors.iconMuted}
        style={{
          fontFamily: Fonts.bodyRegular,
          color: currentTheme.colors.text,
          borderColor: error ? currentTheme.colors.error : currentTheme.colors.border,
          backgroundColor: currentTheme.colors.surface,
        }}
        {...rest}
      />
      {error ? (
        <StyledText className="text-error text-sm mt-1" style={{ fontFamily: Fonts.bodyRegular }}>
          {error}
        </StyledText>
      ) : null}
    </StyledView>
  );
}

export type CardProps = {
  children?: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

export function Card({ children, className, style, onPress }: CardProps) {
  const { currentTheme } = useThemeStore();
  const mergedClass = twMerge('rounded-2xl', className);
  const cardStyle = {
    backgroundColor: currentTheme.colors.card,
    borderWidth: 1,
    borderColor: currentTheme.colors.border,
  };

  if (onPress) {
    return (
      <StyledTouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.92}
        className={mergedClass}
        onPress={onPress}
        style={[cardStyle, style]}
      >
        {children}
      </StyledTouchableOpacity>
    );
  }

  return (
    <StyledView className={mergedClass} style={[cardStyle, style]}>
      {children}
    </StyledView>
  );
}
