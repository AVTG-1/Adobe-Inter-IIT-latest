/**
 * Premium Splash Screen - High-Quality Intro Animation
 *
 * Features: Smooth fade-in, scale, glow effects, particle animation
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type Splash1ScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Splash1'
>;

interface Props {
  navigation: Splash1ScreenNavigationProp;
}

const { width, height } = Dimensions.get('window');

const Splash1Screen: React.FC<Props> = ({ navigation }) => {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(50)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const skipOpacity = useRef(new Animated.Value(0)).current;
  const particle1 = useRef(new Animated.Value(0)).current;
  const particle2 = useRef(new Animated.Value(0)).current;
  const particle3 = useRef(new Animated.Value(0)).current;

  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    // Premium entrance animation sequence
    Animated.parallel([
      // Logo entrance
      Animated.sequence([
        Animated.parallel([
          Animated.spring(logoScale, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        // Pulsing glow effect
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ),
      ]),
      // Title slide up
      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.spring(titleSlide, {
            toValue: 0,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]),
      // Skip button fade in
      Animated.sequence([
        Animated.delay(1000),
        Animated.timing(skipOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Floating particles
      Animated.loop(
        Animated.parallel([
          Animated.timing(particle1, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(particle2, {
            toValue: 1,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(particle3, {
            toValue: 1,
            duration: 3500,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    // Auto-navigate after 3 seconds if not skipped
    const timer = setTimeout(() => {
      if (!skipped) {
        navigation.replace('Home');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation, skipped]);

  const handleSkip = () => {
    setSkipped(true);
    navigation.replace('Home');
  };

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const glowOpacityValue = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <LinearGradient
      colors={['#000000', '#0A0A0A', '#1A1A1A', '#000000']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.content}>
        {/* Floating Particles */}
        <Animated.View
          style={[
            styles.particle,
            {
              top: '20%',
              left: '10%',
              opacity: particle1.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 0],
              }),
              transform: [
                {
                  translateY: particle1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -100],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.particle,
            {
              top: '50%',
              right: '15%',
              opacity: particle2.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 0],
              }),
              transform: [
                {
                  translateY: particle2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -120],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.particle,
            {
              bottom: '30%',
              left: '20%',
              opacity: particle3.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 0],
              }),
              transform: [
                {
                  translateY: particle3.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -80],
                  }),
                },
              ],
            },
          ]}
        />

        {/* Logo Container */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          {/* Glow Effect */}
          <Animated.View
            style={[
              styles.glowCircle,
              {
                opacity: glowOpacityValue,
                transform: [{ scale: glowScale }],
              },
            ]}
          />

          {/* Logo Icon */}
          <View style={styles.iconWrapper}>
            <Ionicons name="camera" size={90} color="#00D9FF" />
          </View>

          {/* Title */}
          <Animated.View
            style={{
              opacity: titleOpacity,
              transform: [{ translateY: titleSlide }],
            }}
          >
            <Text style={styles.title}>AI Photo Editor</Text>
            <Text style={styles.subtitle}>Professional Editing Powered by AI</Text>
            <View style={styles.divider} />
            <Text style={styles.tagline}>Create • Edit • Transform</Text>
          </Animated.View>
        </Animated.View>

        {/* Premium Skip Button */}
        <Animated.View
          style={[
            styles.skipContainer,
            {
              opacity: skipOpacity,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#00D9FF', '#0099CC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.skipGradient}
            >
              <Text style={styles.skipText}>Skip Intro</Text>
              <Ionicons name="arrow-forward" size={18} color="#000" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Loading Dots */}
        <Animated.View style={[styles.dotsContainer, { opacity: titleOpacity }]}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00D9FF',
  },
  logoContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  glowCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#00D9FF',
    top: -50,
  },
  iconWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 217, 255, 0.3)',
    shadowColor: '#00D9FF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 32,
    letterSpacing: 1,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 217, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#B0B0B0',
    marginTop: 12,
    letterSpacing: 2,
    textAlign: 'center',
    fontWeight: '400',
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: '#00D9FF',
    marginVertical: 16,
    alignSelf: 'center',
  },
  tagline: {
    fontSize: 13,
    color: '#00D9FF',
    letterSpacing: 3,
    textAlign: 'center',
    fontWeight: '600',
  },
  skipContainer: {
    position: 'absolute',
    bottom: 60,
    right: 24,
  },
  skipButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#00D9FF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  skipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    letterSpacing: 0.5,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#404040',
  },
  dotActive: {
    backgroundColor: '#00D9FF',
    width: 24,
  },
});

export default Splash1Screen;
