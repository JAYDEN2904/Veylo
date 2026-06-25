import * as Haptics from 'expo-haptics';

/**
 * Haptic feedback service for key user interactions
 */

export const hapticService = {
  /**
   * Light impact for subtle feedback (button taps, selections)
   */
  light: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Haptics not available (simulator/web)
      console.log('Haptics not available');
    }
  },

  /**
   * Medium impact for standard actions (favoriting, toggles)
   */
  medium: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      console.log('Haptics not available');
    }
  },

  /**
   * Heavy impact for important actions (scanning complete, major actions)
   */
  heavy: () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (error) {
      console.log('Haptics not available');
    }
  },

  /**
   * Success feedback for positive actions
   */
  success: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.log('Haptics not available');
    }
  },

  /**
   * Warning feedback for cautionary actions
   */
  warning: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error) {
      console.log('Haptics not available');
    }
  },

  /**
   * Error feedback for error states
   */
  error: () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (error) {
      console.log('Haptics not available');
    }
  },

  /**
   * Selection feedback for picker/selections
   */
  selection: () => {
    try {
      Haptics.selectionAsync();
    } catch (error) {
      console.log('Haptics not available');
    }
  },
};
