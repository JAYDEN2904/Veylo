import React from 'react';
import { TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { Typography } from './common';
import { theme } from '../theme';
import { Accessibility } from '../utils/accessibility';

interface AccessibleButtonProps extends TouchableOpacityProps {
  label: string;
  hint?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  icon?: string;
  children?: React.ReactNode;
}

/**
 * Accessible button component with proper accessibility labels
 */
export const AccessibleButton = ({
  label,
  hint,
  variant = 'primary',
  icon,
  children,
  ...props
}: AccessibleButtonProps) => {
  const getAccessibilityLabel = () => {
    const standardLabel =
      Accessibility.labels[label.toLowerCase() as keyof typeof Accessibility.labels];
    return standardLabel || label;
  };

  const getAccessibilityHint = () => {
    if (hint) return hint;
    const standardHint =
      Accessibility.hints[label.toLowerCase() as keyof typeof Accessibility.hints];
    return standardHint;
  };

  return (
    <TouchableOpacity
      {...props}
      accessibilityRole="button"
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityHint={getAccessibilityHint()}
      accessibilityState={{
        disabled: props.disabled || false,
      }}
    >
      {children || (
        <Typography
          style={{
            color: variant === 'primary' ? '#FFF' : theme.colors.text,
            fontWeight: '600',
          }}
        >
          {label}
        </Typography>
      )}
    </TouchableOpacity>
  );
};
