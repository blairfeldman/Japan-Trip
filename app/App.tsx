import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { useFonts, SourceSerif4_400Regular, SourceSerif4_600SemiBold } from '@expo-google-fonts/source-serif-4';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { AppStateProvider } from './src/store/AppState';
import RootNavigator from './src/navigation/RootNavigator';
import { COLORS } from './src/theme';
import './src/services/notifications'; // registers the background geofencing task

export const navigationRef = React.createRef<NavigationContainerRef<any>>();

function ShareIntentBridge() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (hasShareIntent && (shareIntent.webUrl || shareIntent.text)) {
      navigationRef.current?.navigate('ShareSheet', { url: shareIntent.webUrl ?? shareIntent.text ?? '' });
      resetShareIntent();
    }
  }, [hasShareIntent]);

  return null;
}

export default function App() {
  const [fontsLoaded] = useFonts({ SourceSerif4_400Regular, SourceSerif4_600SemiBold });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg }}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ShareIntentProvider>
          <AppStateProvider>
            <NavigationContainer ref={navigationRef}>
              <ShareIntentBridge />
              <RootNavigator />
            </NavigationContainer>
            <StatusBar style="dark" />
          </AppStateProvider>
        </ShareIntentProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
