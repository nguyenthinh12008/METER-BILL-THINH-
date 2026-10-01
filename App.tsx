/**
 * MeterBill
 * @format
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SplashScreen from './src/components/SplashScreen';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

const SPLASH_MIN_MS = 1600;
const SPLASH_FADE_MS = 350;

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const [splashVisible, setSplashVisible] = useState(true);
  const splashOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: SPLASH_FADE_MS,
        useNativeDriver: true,
      }).start(() => setSplashVisible(false));
    }, SPLASH_MIN_MS);
    return () => clearTimeout(timer);
  }, [splashOpacity]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={splashVisible || isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.root}>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
        {splashVisible ? (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: splashOpacity }]}>
            <SplashScreen />
          </Animated.View>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

export default App;
