import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Typography } from './commonPrimitives';
import { theme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface StyleMatchBadgeProps {
  score: number; // 0-100
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const StyleMatchBadge: React.FC<StyleMatchBadgeProps> = ({
  score,
  size = 'medium',
  showLabel = true,
}) => {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#10B981'; // Green - Excellent match
    if (score >= 60) return theme.colors.secondary; // Gold - Good match
    if (score >= 40) return '#F59E0B'; // Orange - Fair match
    return '#6B7280'; // Gray - Poor match
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Perfect Match';
    if (score >= 60) return 'Great Match';
    if (score >= 40) return 'Good Match';
    return 'Fair Match';
  };

  const sizeStyles = {
    small: {
      container: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
      text: { fontSize: 10 },
      icon: 12,
    },
    medium: {
      container: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
      text: { fontSize: 12 },
      icon: 14,
    },
    large: {
      container: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
      text: { fontSize: 14 },
      icon: 16,
    },
  };

  const styles = sizeStyles[size];
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <TouchableOpacity activeOpacity={0.8}>
      <LinearGradient
        colors={[color + '20', color + '10']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          ...styles.container,
          borderWidth: 1,
          borderColor: color + '40',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Ionicons
          name="checkmark-circle"
          size={styles.icon}
          color={color}
          style={{ marginRight: 6 }}
        />
        {showLabel && (
          <Typography
            style={{
              color: color,
              fontWeight: '600',
              ...styles.text,
            }}
          >
            {label}
          </Typography>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};
