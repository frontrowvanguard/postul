import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Text, TextInput } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { defaultFontFamily } from '@/constants/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Set default font family for all Text and TextInput components
// This ensures SF Pro (System font on iOS) is used throughout the app
const setDefaultFontFamily = () => {
  const fontFamily = defaultFontFamily;
  
  // Set default font family for Text components
  // @ts-ignore - React Native allows setting defaultProps
  if (Text.defaultProps == null) Text.defaultProps = {};
  // Merge with existing defaultProps.style if it exists
  Text.defaultProps.style = [
    Text.defaultProps.style,
    { fontFamily },
  ].filter(Boolean);
  
  // Set default font family for TextInput components
  // @ts-ignore - React Native allows setting defaultProps
  if (TextInput.defaultProps == null) TextInput.defaultProps = {};
  // Merge with existing defaultProps.style if it exists
  TextInput.defaultProps.style = [
    TextInput.defaultProps.style,
    { fontFamily },
  ].filter(Boolean);
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    setDefaultFontFamily();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          animation: 'slide_from_right',
          animationDuration: 300,
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="project/[id]"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 300,
          }}
        />
        <Stack.Screen
          name="project/[id]/survey-post"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 300,
          }}
        />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
