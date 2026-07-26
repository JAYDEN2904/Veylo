import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { AppState, AppStateStatus, View, Platform, StyleSheet, Appearance } from 'react-native';
import { BlurView } from 'expo-blur';
import {
  AppTabParamList,
  AppRootStackParamList,
  TodayStackParamList,
  ScanStackParamList,
  OutfitStackParamList,
  FeedStackParamList,
  ProfileStackParamList,
} from './types';
import { useThemeStore } from '../store/useThemeStore';
import { getMainTabBarFloatingStyle } from './tabBarStyles';
import { usePendingRatingStore } from '../store/usePendingRatingStore';
import { useAuthStore } from '../store/useAuthStore';
import { PostWearRatingSheet } from '../components/PostWearRatingSheet';

// Today + Wardrobe Screens
import { TodayScreen } from '../screens/today/TodayScreen';
import { WardrobeHomeScreen } from '../screens/wardrobe/WardrobeHomeScreen';
import { WardrobeSearchScreen } from '../screens/wardrobe/WardrobeSearchScreen';
import { CollectionsScreen } from '../screens/wardrobe/CollectionsScreen';
import { CollectionDetailScreen } from '../screens/wardrobe/CollectionDetailScreen';
import { OutfitOrganizationScreen } from '../screens/wardrobe/OutfitOrganizationScreen';
import { ItemDetailsScreen } from '../screens/item/ItemDetailsScreen';

// Scan Screens
import { LiveCameraScanScreen } from '../screens/scan/LiveCameraScanScreen';
import { ScanProcessingScreen } from '../screens/scan/ScanProcessingScreen';
import { TagReviewScreen } from '../screens/scan/TagReviewScreen';
import { BatchScanQueueScreen } from '../screens/scan/BatchScanQueueScreen';
import { SaveItemConfirmationScreen } from '../screens/scan/SaveItemConfirmationScreen';
import { ScanFailureScreen } from '../screens/scan/ScanFailureScreen';

// Outfit Screens
import { OutfitHomeScreen } from '../screens/outfit/OutfitHomeScreen';
import { GenerateOutfitFlowScreen } from '../screens/outfit/GenerateOutfitFlowScreen';
import { CreateOutfitScreen } from '../screens/outfit/CreateOutfitScreen';
import { OutfitLoadingScreen } from '../screens/outfit/OutfitLoadingScreen';
import { OutfitResultScreen } from '../screens/outfit/OutfitResultScreen';
import { AvatarPreviewScreen } from '../screens/outfit/AvatarPreviewScreen';

// TryOn Screens
import { VirtualTryOnScreen } from '../screens/tryon/VirtualTryOnScreen';
import { TryOnProcessingScreen } from '../screens/tryon/TryOnProcessingScreen';
import { TryOnResultScreen } from '../screens/tryon/TryOnResultScreen';
import { TryOnHistoryScreen } from '../screens/tryon/TryOnHistoryScreen';

// Feed / insights
import { StyleFeedScreen } from '../screens/feed/StyleFeedScreen';
import { AnalyticsDashboardScreen } from '../screens/analytics/AnalyticsDashboardScreen';
import { ClosetCompositionScreen } from '../screens/analytics/ClosetCompositionScreen';
import { ItemTimelineScreen } from '../screens/analytics/ItemTimelineScreen';
import { RecommendationsScreen } from '../screens/recommendations/RecommendationsScreen';

// Profile Screens
import { ProfileScreen } from '../screens/settings/ProfileScreen';
import { AppPreferencesScreen } from '../screens/settings/AppPreferencesScreen';
import { NotificationSettingsScreen } from '../screens/settings/NotificationSettingsScreen';
import { PrivacyPermissionsScreen } from '../screens/settings/PrivacyPermissionsScreen';
import { HelpCenterScreen } from '../screens/settings/HelpCenterScreen';
import { AboutScreen } from '../screens/settings/AboutScreen';
import { TermsPrivacyScreen } from '../screens/settings/TermsPrivacyScreen';
import { StyleProfileEditScreen } from '../screens/settings/StyleProfileEditScreen';

// Item edit flows (root stack)
import { EditItemScreen } from '../screens/item/EditItemScreen';
import { ChangeItemPhotoScreen } from '../screens/item/ChangeItemPhotoScreen';
import { OutfitFavoritesScreen } from '../screens/outfit/OutfitFavoritesScreen';

// Calendar Screens
import { CalendarHomeScreen } from '../screens/calendar/CalendarHomeScreen';
import { CalendarEventCreateScreen } from '../screens/calendar/CalendarEventCreateScreen';
import { CalendarHistoryScreen } from '../screens/calendar/CalendarHistoryScreen';
import { CalendarDayScreen } from '../screens/calendar/CalendarDayScreen';
import { CalendarEventDetailScreen } from '../screens/calendar/CalendarEventDetailScreen';
import { CalendarRecurringScreen } from '../screens/calendar/CalendarRecurringScreen';
import { CalendarOutfitSelectScreen } from '../screens/calendar/CalendarOutfitSelectScreen';

// Avatar Screens
import { AvatarGenerationScreen } from '../screens/avatar/AvatarGenerationScreen';
import { AvatarProcessingScreen } from '../screens/avatar/AvatarProcessingScreen';
import { AvatarResultScreen } from '../screens/avatar/AvatarResultScreen';

const Tab = createBottomTabNavigator<AppTabParamList>();
const RootStack = createStackNavigator<AppRootStackParamList>();
const TodayStack = createStackNavigator<TodayStackParamList>();
const ScanStack = createStackNavigator<ScanStackParamList>();
const OutfitStack = createStackNavigator<OutfitStackParamList>();
const FeedStack = createStackNavigator<FeedStackParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();

// Today Navigator — owns TodayScreen and the full wardrobe sub-tree so the
// wardrobe is still reachable from the first tab.
const TodayNavigator = () => (
  <TodayStack.Navigator
    initialRouteName="Today"
    screenOptions={{
      headerShown: false,
    }}
  >
    <TodayStack.Screen name="Today" component={TodayScreen} />
    <TodayStack.Screen name="WardrobeHome" component={WardrobeHomeScreen} />
    <TodayStack.Screen name="WardrobeSearch" component={WardrobeSearchScreen} />
    <TodayStack.Screen name="Collections" component={CollectionsScreen} />
    <TodayStack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
    <TodayStack.Screen name="OutfitOrganization" component={OutfitOrganizationScreen} />
  </TodayStack.Navigator>
);

// Scan Navigator
const ScanNavigator = () => (
  <ScanStack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <ScanStack.Screen name="LiveCameraScan" component={LiveCameraScanScreen} />
    <ScanStack.Screen name="ScanProcessing" component={ScanProcessingScreen} />
    <ScanStack.Screen name="TagReview" component={TagReviewScreen} />
    <ScanStack.Screen name="BatchScanQueue" component={BatchScanQueueScreen} />
    <ScanStack.Screen name="SaveItemConfirmation" component={SaveItemConfirmationScreen} />
    <ScanStack.Screen name="ScanFailure" component={ScanFailureScreen} />
  </ScanStack.Navigator>
);

// Outfit Navigator (only contains the home screen now)
const OutfitNavigator = () => (
  <OutfitStack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <OutfitStack.Screen name="OutfitHome" component={OutfitHomeScreen} />
  </OutfitStack.Navigator>
);

// Feed tab: style feed, insights, recommendations, deep analytics screens
const FeedNavigator = () => (
  <FeedStack.Navigator
    screenOptions={{
      headerShown: false,
    }}
    initialRouteName="StyleFeed"
  >
    <FeedStack.Screen name="StyleFeed" component={StyleFeedScreen} />
    <FeedStack.Screen name="ClosetInsights" component={AnalyticsDashboardScreen} />
    <FeedStack.Screen
      name="Recommendations"
      component={RecommendationsScreen}
      options={{ title: 'Shopping & gaps' }}
    />
    <FeedStack.Screen name="ClosetComposition" component={ClosetCompositionScreen} />
    <FeedStack.Screen name="ItemTimeline" component={ItemTimelineScreen} />
  </FeedStack.Navigator>
);

// Profile Navigator
const ProfileNavigator = () => (
  <ProfileStack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <ProfileStack.Screen name="Profile" component={ProfileScreen} />
    <ProfileStack.Screen name="AppPreferences" component={AppPreferencesScreen} />
    <ProfileStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
    <ProfileStack.Screen name="PrivacyPermissions" component={PrivacyPermissionsScreen} />
    <ProfileStack.Screen name="HelpCenter" component={HelpCenterScreen} />
    <ProfileStack.Screen name="About" component={AboutScreen} />
    <ProfileStack.Screen name="StyleProfileEdit" component={StyleProfileEditScreen} />
    <ProfileStack.Screen name="TermsPrivacy" component={TermsPrivacyScreen} />
  </ProfileStack.Navigator>
);

// Main Tab Navigator
const MainTabs = () => {
  const { currentTheme, mode } = useThemeStore();
  const scheme = mode === 'system' ? Appearance.getColorScheme() : mode;
  const isDark = scheme === 'dark';
  const floatingTabBarStyle = getMainTabBarFloatingStyle(mode, currentTheme.colors.surface);
  const activeTint = isDark ? currentTheme.colors.secondary : currentTheme.colors.primary;
  const inactiveTint = currentTheme.colors.textSecondary;
  const cameraIconColor = currentTheme.colors.primary;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: inactiveTint,
        tabBarShowLabel: false,
        tabBarBackground:
          Platform.OS === 'ios'
            ? () => (
                <BlurView
                  intensity={isDark ? 42 : 78}
                  tint={isDark ? 'dark' : 'light'}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 28, overflow: 'hidden' }]}
                />
              )
            : () => (
                <View
                  style={[
                    StyleSheet.absoluteFillObject,
                    { backgroundColor: currentTheme.colors.surface, borderRadius: 28 },
                  ]}
                />
              ),
        tabBarIcon: ({ focused, color }) => {
          // Tab icons (Ionicons v5): Today=home, Outfits=shirt, Scan=camera FAB, Insights=analytics, Profile=person
          let iconName: string;

          if (route.name === 'TodayStack') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'OutfitsStack') {
            iconName = focused ? 'shirt' : 'shirt-outline';
          } else if (route.name === 'ScanStack') {
            iconName = 'camera';
          } else if (route.name === 'FeedStack') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'ProfileStack') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'ellipse-outline';
          }

          if (route.name === 'ScanStack') {
            return (
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: currentTheme.colors.secondary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginTop: -32,
                  shadowColor: currentTheme.colors.secondary,
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 8,
                }}
                accessibilityRole="button"
              >
                <Ionicons name={iconName as never} size={28} color={cameraIconColor} />
              </View>
            );
          }

          return (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={iconName as never} size={24} color={color} />
            </View>
          );
        },
        tabBarStyle: floatingTabBarStyle,
        tabBarItemStyle: {
          paddingVertical: 10,
        },
      })}
    >
      <Tab.Screen
        name="TodayStack"
        component={TodayNavigator}
        options={{ title: 'Today', tabBarAccessibilityLabel: 'Today' }}
      />
      <Tab.Screen
        name="OutfitsStack"
        component={OutfitNavigator}
        options={{ title: 'Outfits', tabBarAccessibilityLabel: 'Outfits' }}
      />
      <Tab.Screen
        name="ScanStack"
        component={ScanNavigator}
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarAccessibilityLabel: 'Scan clothing',
        }}
      />
      <Tab.Screen
        name="FeedStack"
        component={FeedNavigator}
        options={{
          title: 'Insights',
          tabBarAccessibilityLabel: 'Closet insights and usage',
        }}
      />
      <Tab.Screen
        name="ProfileStack"
        component={ProfileNavigator}
        options={{ title: 'Profile', tabBarAccessibilityLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

// Root Navigator - Wraps MainTabs and provides full-screen flow screens
export const AppNavigator = () => {
  const { currentTheme } = useThemeStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pending = usePendingRatingStore((s) => s.pending);
  const [ratingSheetVisible, setRatingSheetVisible] = useState(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const maybeShowRatingSheet = useCallback(() => {
    if (isAuthenticated && pending) {
      setRatingSheetVisible(true);
    }
  }, [isAuthenticated, pending]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        maybeShowRatingSheet();
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [maybeShowRatingSheet]);

  return (
    <>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          presentation: 'modal',
          cardStyle: { backgroundColor: currentTheme.colors.background },
        }}
      >
        <RootStack.Screen name="MainTabs" component={MainTabs} />

        {/* Outfit Generation Flow - Full screen, no tab bar */}
        <RootStack.Screen
          name="GenerateOutfitFlow"
          component={GenerateOutfitFlowScreen}
          options={{ presentation: 'card' }}
        />
        <RootStack.Screen
          name="CreateOutfit"
          component={CreateOutfitScreen}
          options={{ presentation: 'card' }}
        />
        <RootStack.Screen
          name="OutfitLoading"
          component={OutfitLoadingScreen}
          options={{ presentation: 'card', gestureEnabled: false }}
        />
        <RootStack.Screen
          name="OutfitResult"
          component={OutfitResultScreen}
          options={{ presentation: 'card' }}
        />
        <RootStack.Screen
          name="AvatarPreview"
          component={AvatarPreviewScreen}
          options={{ presentation: 'card' }}
        />

        {/* Virtual Try-On Flow - Full screen, no tab bar */}
        <RootStack.Screen
          name="VirtualTryOn"
          component={VirtualTryOnScreen}
          options={{ presentation: 'card' }}
        />
        <RootStack.Screen
          name="TryOnProcessing"
          component={TryOnProcessingScreen}
          options={{ presentation: 'card', gestureEnabled: false }}
        />
        <RootStack.Screen
          name="TryOnResult"
          component={TryOnResultScreen}
          options={{ presentation: 'card' }}
        />
        <RootStack.Screen
          name="TryOnHistory"
          component={TryOnHistoryScreen}
          options={{ presentation: 'card' }}
        />

        {/* Avatar Generation Flow - Full screen, no tab bar */}
        <RootStack.Screen
          name="AvatarGeneration"
          component={AvatarGenerationScreen}
          options={{ presentation: 'card' }}
        />
        <RootStack.Screen
          name="AvatarProcessing"
          component={AvatarProcessingScreen}
          options={{ presentation: 'card', gestureEnabled: false }}
        />
        <RootStack.Screen
          name="AvatarResult"
          component={AvatarResultScreen}
          options={{ presentation: 'card' }}
        />

        {/* Calendar Flow - Full screen, no tab bar */}
        <RootStack.Screen
          name="CalendarHome"
          component={CalendarHomeScreen}
          options={{ presentation: 'card' }}
        />
        <RootStack.Screen
          name="CalendarEventCreate"
          component={CalendarEventCreateScreen}
          options={{ presentation: 'card' }}
        />
        <RootStack.Screen
          name="CalendarHistory"
          component={CalendarHistoryScreen}
          options={{ presentation: 'card' }}
        />
        <RootStack.Screen
          name="CalendarDay"
          component={CalendarDayScreen}
          options={{ presentation: 'card' }}
        />
        <RootStack.Screen
          name="CalendarEventDetail"
          component={CalendarEventDetailScreen}
          options={{ presentation: 'card' }}
        />
        <RootStack.Screen
          name="CalendarRecurring"
          component={CalendarRecurringScreen}
          options={{ presentation: 'card' }}
        />
        <RootStack.Screen
          name="CalendarOutfitSelect"
          component={CalendarOutfitSelectScreen}
          options={{ presentation: 'card' }}
        />

        {/* Item Details - Full screen, no tab bar */}
        <RootStack.Screen
          name="ItemDetails"
          component={ItemDetailsScreen}
          options={{ presentation: 'card' }}
        />
        <RootStack.Screen
          name="EditItem"
          component={EditItemScreen}
          options={{ presentation: 'card' }}
        />
        <RootStack.Screen
          name="ChangeItemPhoto"
          component={ChangeItemPhotoScreen}
          options={{ presentation: 'card' }}
        />
        <RootStack.Screen
          name="OutfitFavorites"
          component={OutfitFavoritesScreen}
          options={{ presentation: 'card' }}
        />
      </RootStack.Navigator>
      <PostWearRatingSheet
        visible={ratingSheetVisible}
        onDismiss={() => setRatingSheetVisible(false)}
      />
    </>
  );
};
