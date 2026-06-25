import React from 'react';
import { ScrollView, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyledView } from './common';
import { getTabScreenContentPaddingBottom } from '../constants/layout';
import { useThemeStore } from '../store/useThemeStore';

type ScreenShellProps = {
  children: React.ReactNode;
  className?: string;
  /** Use inner ScrollView with safe top + optional tab bar bottom padding */
  scroll?: boolean;
  /** Add extra bottom space for the floating tab bar (main tab screens) */
  tabScreen?: boolean;
  contentContainerStyle?: ViewStyle;
  /** Extra horizontal padding (default 24 when tabScreen) */
  horizontalPadding?: number;
};

/**
 * Consistent safe-area insets and floating tab bar spacing for main app screens.
 */
export function ScreenShell({
  children,
  className,
  scroll = false,
  tabScreen = false,
  contentContainerStyle,
  horizontalPadding = 24,
}: ScreenShellProps) {
  const insets = useSafeAreaInsets();
  const { currentTheme } = useThemeStore();
  const bg = currentTheme.colors.background;

  const paddingTop = insets.top + 12;
  const paddingBottom = tabScreen
    ? getTabScreenContentPaddingBottom(insets.bottom)
    : insets.bottom + 24;

  if (scroll) {
    return (
      <StyledView style={{ flex: 1, backgroundColor: bg }} className={className}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            {
              paddingTop,
              paddingBottom,
              paddingHorizontal: horizontalPadding,
            },
            contentContainerStyle,
          ]}
        >
          {children}
        </ScrollView>
      </StyledView>
    );
  }

  return (
    <StyledView
      style={{
        flex: 1,
        backgroundColor: bg,
        paddingTop,
        paddingBottom,
        paddingHorizontal: horizontalPadding,
      }}
      className={className}
    >
      {children}
    </StyledView>
  );
}
