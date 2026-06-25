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
  type TouchableOpacityProps,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { styled } from 'nativewind';
import { twMerge } from 'tailwind-merge';

import { theme } from '../theme';

const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);

export const StyledView = styled(View);
export const StyledTouchableOpacity = styled(TouchableOpacity);
export const StyledImage = styled(Image);

export type ScreenProps = ViewProps & {
  className?: string;
};

export function Screen({ children, className, style, ...rest }: ScreenProps) {
  return (
    <StyledView className={twMerge('flex-1', className)} style={style} {...rest}>
      {children}
    </StyledView>
  );
}

export type TypographyProps = TextProps & {
  variant?: 'header' | 'body' | 'secondary';
  className?: string;
};

export function Typography({ variant = 'body', className, style, ...rest }: TypographyProps) {
  const variantClass =
    variant === 'header'
      ? 'font-bold text-primary'
      : variant === 'secondary'
        ? 'text-gray-500'
        : '';
  return <StyledText className={twMerge(variantClass, className)} style={style} {...rest} />;
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
  const isDisabled = disabled ?? loading;

  const containerClass =
    variant === 'outline'
      ? 'rounded-xl py-4 px-6 items-center justify-center min-h-[48px] border-2 border-accent bg-transparent'
      : variant === 'secondary'
        ? 'rounded-xl py-4 px-6 items-center justify-center min-h-[48px] bg-secondary'
        : variant === 'ghost'
          ? 'rounded-xl py-4 px-6 items-center justify-center min-h-[48px] bg-transparent'
          : 'rounded-xl py-4 px-6 items-center justify-center min-h-[48px] bg-accent';

  const titleClass =
    variant === 'outline'
      ? 'text-base font-semibold text-accent'
      : variant === 'secondary'
        ? 'text-base font-semibold text-primary'
        : variant === 'ghost'
          ? 'text-base font-semibold text-error'
          : 'text-base font-semibold text-white';

  const spinnerColor =
    variant === 'outline'
      ? theme.colors.accent
      : variant === 'secondary'
        ? theme.colors.primary
        : variant === 'ghost'
          ? theme.colors.error
          : theme.colors.onPrimary;

  return (
    <StyledTouchableOpacity
      accessibilityRole="button"
      activeOpacity={activeOpacity}
      className={twMerge(containerClass, className)}
      disabled={isDisabled}
      onPress={onPress}
      style={style}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <StyledText className={titleClass}>{title}</StyledText>
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
  const inputClass = twMerge(
    'border rounded-xl px-4 py-3 text-base text-primary border-gray-300',
    error ? 'border-error' : ''
  );

  return (
    <StyledView className={twMerge('w-full', className)}>
      {label ? (
        <StyledText className="text-sm font-medium text-gray-700 mb-2">{label}</StyledText>
      ) : null}
      <StyledTextInput className={inputClass} placeholderTextColor="#9CA3AF" {...rest} />
      {error ? <StyledText className="text-error text-sm mt-1">{error}</StyledText> : null}
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
  const mergedClass = twMerge('bg-card rounded-2xl border border-gray-100', className);

  if (onPress) {
    return (
      <StyledTouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.92}
        className={mergedClass}
        onPress={onPress}
        style={style}
      >
        {children}
      </StyledTouchableOpacity>
    );
  }

  return (
    <StyledView className={mergedClass} style={style}>
      {children}
    </StyledView>
  );
}
