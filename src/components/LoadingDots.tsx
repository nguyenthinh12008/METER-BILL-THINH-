import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

interface Props {
  label?: string;
  color?: string;
  size?: number;
  labelColor?: string;
  /** false cho view render ở lần mount đầu tiên của app (splash) — native driver không bám được. */
  nativeDriver?: boolean;
}

const DOT_COUNT = 3;
const STEP_MS = 160;

function LoadingDots({
  label,
  color = '#1d4ed8',
  size = 10,
  labelColor = '#666',
  nativeDriver = true,
}: Props): React.JSX.Element {
  const values = useRef(
    Array.from({ length: DOT_COUNT }, () => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    const loops = values.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * STEP_MS),
          Animated.timing(value, {
            toValue: 1,
            duration: 350,
            easing: Easing.out(Easing.quad),
            useNativeDriver: nativeDriver,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 350,
            easing: Easing.in(Easing.quad),
            useNativeDriver: nativeDriver,
          }),
          Animated.delay((DOT_COUNT - index) * STEP_MS),
        ]),
      ),
    );
    loops.forEach(loop => loop.start());
    return () => loops.forEach(loop => loop.stop());
  }, [values, nativeDriver]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.dotsRow}>
        {values.map((value, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                transform: [
                  {
                    translateY: value.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -size],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
      {label ? <Text style={[styles.label, { color: labelColor }]}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 28,
    gap: 8,
  },
  dot: {},
  label: {
    marginTop: 10,
    color: '#666',
    fontSize: 13,
  },
});

export default LoadingDots;
