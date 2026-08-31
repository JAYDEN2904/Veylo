import { Platform } from 'react-native';

/** Height of the floating pill tab bar (matches AppNavigator tabBarStyle.height) */
export const FLOATING_TAB_BAR_HEIGHT = 72;

/** Bottom offset of the tab bar from screen edge */
export const FLOATING_TAB_BAR_BOTTOM_OFFSET = Platform.OS === 'ios' ? 24 : 16;

export const TAB_BAR_HORIZONTAL_INSET = 20;

/** Extra clearance for the docked camera FAB that protrudes above the pill bar */
export const CAMERA_FAB_PROTRUSION = 28;

/**
 * Bottom padding for ScrollView/FlatList content so it clears the floating tab bar + home indicator.
 */
export function getTabScreenContentPaddingBottom(safeAreaBottom: number): number {
  return (
    FLOATING_TAB_BAR_HEIGHT +
    safeAreaBottom +
    FLOATING_TAB_BAR_BOTTOM_OFFSET +
    CAMERA_FAB_PROTRUSION +
    12
  );
}
