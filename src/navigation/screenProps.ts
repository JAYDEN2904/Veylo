import type { CompositeScreenProps, NavigationProp, ParamListBase } from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import type {
  AppRootStackParamList,
  AppTabParamList,
  AuthStackParamList,
  TodayStackParamList,
  ScanStackParamList,
  OutfitStackParamList,
  FeedStackParamList,
  ProfileStackParamList,
} from './types';

/** Full-screen flows registered on the app root stack (above tabs). */
export type RootStackScreenProps<T extends keyof AppRootStackParamList> = StackScreenProps<
  AppRootStackParamList,
  T
>;

/** Pre–MainTabs auth stack. */
export type AuthStackScreenProps<T extends keyof AuthStackParamList> = StackScreenProps<
  AuthStackParamList,
  T
>;

type TabProps = BottomTabScreenProps<AppTabParamList>;

export type TodayStackScreenProps<T extends keyof TodayStackParamList> = CompositeScreenProps<
  StackScreenProps<TodayStackParamList, T>,
  TabProps
>;

/** @deprecated use TodayStackScreenProps — kept as alias during migration. */
export type WardrobeStackScreenProps<T extends keyof TodayStackParamList> =
  TodayStackScreenProps<T>;

export type ScanStackScreenProps<T extends keyof ScanStackParamList> = CompositeScreenProps<
  StackScreenProps<ScanStackParamList, T>,
  TabProps
>;

export type OutfitStackScreenProps<T extends keyof OutfitStackParamList> = CompositeScreenProps<
  StackScreenProps<OutfitStackParamList, T>,
  TabProps
>;

export type FeedStackScreenProps<T extends keyof FeedStackParamList> = CompositeScreenProps<
  StackScreenProps<FeedStackParamList, T>,
  TabProps
>;

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> = CompositeScreenProps<
  StackScreenProps<ProfileStackParamList, T>,
  TabProps
>;

/**
 * Walks parent navigators until the bottom-tab navigator is found.
 */
export function getBottomTabNavigatorNavigation(
  navigation: NavigationProp<ParamListBase>
): NavigationProp<ParamListBase> | undefined {
  let parent = navigation.getParent();
  while (parent) {
    const state = parent.getState();
    if (state && 'type' in state && state.type === 'tab') {
      return parent;
    }
    parent = parent.getParent();
  }
  return undefined;
}

/**
 * Finds the app root stack (the navigator that owns MainTabs + focused flows).
 */
export function getAppRootNavigation(
  navigation: NavigationProp<ParamListBase>
): NavigationProp<ParamListBase> | undefined {
  let current: NavigationProp<ParamListBase> | undefined = navigation;
  while (current) {
    const routeNames = current.getState()?.routeNames ?? [];
    if (routeNames.includes('MainTabs') || routeNames.includes('LiveCameraScan')) {
      return current;
    }
    current = current.getParent();
  }
  return undefined;
}

/** Opens the focused camera/library capture flow above the tab bar. */
export function navigateToScanCapture(navigation: NavigationProp<ParamListBase>): void {
  const root = getAppRootNavigation(navigation);
  if (root) {
    root.navigate('LiveCameraScan' as never);
    return;
  }
  navigation.navigate('LiveCameraScan' as never);
}

/** Returns from a focused scan/outfit flow to the wardrobe tab. */
export function navigateToWardrobe(navigation: NavigationProp<ParamListBase>): void {
  const root = getAppRootNavigation(navigation);
  if (root) {
    const navigateRoot = root.navigate as unknown as (name: string, params?: object) => void;
    navigateRoot('MainTabs', {
      screen: 'TodayStack',
      params: { screen: 'WardrobeHome' },
    });
    return;
  }
  if (navigation.canGoBack()) {
    navigation.goBack();
  }
}
