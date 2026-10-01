import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import LoadingDots from './LoadingDots';

function SplashScreen(): React.JSX.Element {
  const appear = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // JS driver có chủ đích: view splash là view đầu tiên của app, native driver
    // khởi chạy trước khi view gắn vào cây native nên opacity bị kẹt ở 0.
    Animated.timing(appear, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [appear, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const translateY = appear.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.content, { opacity: appear, transform: [{ translateY }] }]}>
        <Animated.View style={[styles.logo, { transform: [{ scale }] }]}>
          <Text style={styles.logoText}>⚡</Text>
        </Animated.View>
        <Text style={styles.title}>MeterBill</Text>
        <Text style={styles.subtitle}>Quản lý & in hóa đơn điện nước</Text>
        <LoadingDots
          color="#ffffff"
          labelColor="rgba(255,255,255,0.85)"
          label="Đang khởi động..."
          nativeDriver={false}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1d4ed8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 48,
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 24,
  },
});

export default SplashScreen;
