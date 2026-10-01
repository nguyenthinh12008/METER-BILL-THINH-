import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface Props {
  rows?: number;
}

function SkeletonList({ rows = 6 }: Props): React.JSX.Element {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });

  return (
    <View>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.row}>
          <Animated.View style={[styles.lineTitle, { opacity }]} />
          <Animated.View style={[styles.lineSubtitle, { opacity }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  lineTitle: {
    height: 14,
    width: '55%',
    borderRadius: 4,
    backgroundColor: '#dcdfe4',
  },
  lineSubtitle: {
    height: 11,
    width: '35%',
    borderRadius: 4,
    backgroundColor: '#e6e8ec',
    marginTop: 8,
  },
});

export default SkeletonList;
