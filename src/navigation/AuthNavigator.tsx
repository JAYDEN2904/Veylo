import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthStackParamList } from './types';

// Import Screens
import { SplashScreen } from '../screens/auth/SplashScreen';
import { WelcomeCarouselScreen } from '../screens/auth/WelcomeCarouselScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignupScreen } from '../screens/auth/SignupScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { EmailVerificationScreen } from '../screens/auth/EmailVerificationScreen';
import { PermissionsRequestScreen } from '../screens/auth/PermissionsRequestScreen';
import { StyleQuizScreen } from '../screens/auth/StyleQuizScreen';
import { StyleDnaRevealScreen } from '../screens/auth/StyleDnaRevealScreen';

const Stack = createStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Welcome" component={WelcomeCarouselScreen} />
      <Stack.Screen name="StyleQuiz" component={StyleQuizScreen} />
      <Stack.Screen name="StyleDnaReveal" component={StyleDnaRevealScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
      <Stack.Screen name="Permissions" component={PermissionsRequestScreen} />
    </Stack.Navigator>
  );
};
