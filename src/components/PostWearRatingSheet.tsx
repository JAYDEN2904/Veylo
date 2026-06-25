import React, { useState } from 'react';
import { Modal, Pressable, View, Platform } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from './common';
import { useThemeStore } from '../store/useThemeStore';
import { usePendingRatingStore, type WearRatingOutcome } from '../store/usePendingRatingStore';

const OUTCOMES: { id: WearRatingOutcome; label: string; icon: string; description: string }[] = [
  {
    id: 'compliments',
    label: 'Got compliments',
    icon: 'star-outline',
    description: 'People noticed and said something nice',
  },
  {
    id: 'felt_great',
    label: 'Felt great',
    icon: 'happy-outline',
    description: 'You felt confident and comfortable all day',
  },
  {
    id: 'wear_again',
    label: 'Would wear again',
    icon: 'repeat-outline',
    description: 'This combo is a keeper',
  },
];

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export const PostWearRatingSheet = ({ visible, onDismiss }: Props) => {
  const { currentTheme } = useThemeStore();
  const { pending, submitRating, clearPending } = usePendingRatingStore();
  const [selected, setSelected] = useState<Set<WearRatingOutcome>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const toggleOutcome = (id: WearRatingOutcome) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitRating(Array.from(selected) as WearRatingOutcome[]);
      setSelected(new Set());
      onDismiss();
    } catch {
      // submitRating is best-effort; still dismiss
      clearPending();
      onDismiss();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    clearPending();
    setSelected(new Set());
    onDismiss();
  };

  if (!pending) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleSkip}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'flex-end',
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={handleSkip} />
        <Animated.View
          entering={SlideInDown.springify().damping(16)}
          exiting={SlideOutDown.duration(200)}
          style={{
            backgroundColor: currentTheme.colors.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            padding: 24,
            paddingBottom: Platform.OS === 'ios' ? 44 : 28,
          }}
        >
          {/* Drag handle */}
          <View
            style={{
              alignSelf: 'center',
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: currentTheme.colors.border,
              marginBottom: 20,
            }}
          />

          <Typography
            style={{
              color: currentTheme.colors.text,
              fontSize: 20,
              fontWeight: '700',
              marginBottom: 4,
            }}
          >
            How did that outfit feel?
          </Typography>
          <Typography
            style={{
              color: currentTheme.colors.textSecondary,
              fontSize: 13,
              marginBottom: 24,
            }}
          >
            {pending.outfitName} · Yesterday
          </Typography>

          <View style={{ gap: 12, marginBottom: 28 }}>
            {OUTCOMES.map((outcome) => {
              const isSelected = selected.has(outcome.id);
              return (
                <Pressable
                  key={outcome.id}
                  onPress={() => toggleOutcome(outcome.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    padding: 16,
                    borderRadius: 16,
                    borderWidth: 2,
                    borderColor: isSelected
                      ? currentTheme.colors.primary
                      : currentTheme.colors.border,
                    backgroundColor: isSelected
                      ? `${currentTheme.colors.primary}12`
                      : currentTheme.colors.background,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: isSelected
                        ? currentTheme.colors.primary
                        : currentTheme.colors.mutedSurface,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons
                      name={outcome.icon as any}
                      size={22}
                      color={isSelected ? '#FFF' : currentTheme.colors.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Typography
                      style={{
                        color: currentTheme.colors.text,
                        fontSize: 15,
                        fontWeight: '600',
                      }}
                    >
                      {outcome.label}
                    </Typography>
                    <Typography
                      style={{
                        color: currentTheme.colors.textSecondary,
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {outcome.description}
                    </Typography>
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={currentTheme.colors.primary}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={{
              backgroundColor: currentTheme.colors.primary,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              opacity: submitting ? 0.6 : 1,
              marginBottom: 10,
            }}
          >
            <Typography style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
              {submitting ? 'Saving…' : selected.size > 0 ? 'Save feedback' : 'None of the above'}
            </Typography>
          </Pressable>

          <Pressable onPress={handleSkip} style={{ alignItems: 'center', paddingVertical: 6 }}>
            <Typography
              style={{ color: currentTheme.colors.textSecondary, fontSize: 13, fontWeight: '500' }}
            >
              Skip
            </Typography>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};
