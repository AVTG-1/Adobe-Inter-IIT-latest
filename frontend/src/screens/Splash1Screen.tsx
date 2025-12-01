/**
 * Splash Screen - Stunning Photo Editor Intro
 *
 * Features: Cinematic animations, gradient background, smooth transitions
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Easing,
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
  // Main animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(50)).current;
  const subtitleSlide = useRef(new Animated.Value(50)).current;

  // Floating elements
  const particle1 = useRef(new Animated.Value(0)).current;
  const particle2 = useRef(new Animated.Value(0)).current;
  const particle3 = useRef(new Animated.Value(0)).current;
  const particle4 = useRef(new Animated.Value(0)).current;
  const particle5 = useRef(new Animated.Value(0)).current;
  const particle6 = useRef(new Animated.Value(0)).current;

  // Glow effect
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Main entrance sequence
    Animated.sequence([
      // Logo appears with bounce
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotate, {
          toValue: 1,
          duration: 1200,
          easing: Easing.elastic(1.2),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Title and subtitle slide in
      Animated.parallel([
        Animated.spring(titleSlide, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(subtitleSlide, {
          toValue: 0,
          delay: 100,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Continuous glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating particles animations
    const particleAnimation = (particle: Animated.Value, delay: number, duration: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(particle, {
            toValue: 1,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(particle, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    particleAnimation(particle1, 0, 4000);
    particleAnimation(particle2, 500, 3500);
    particleAnimation(particle3, 1000, 4500);
    particleAnimation(particle4, 1500, 3800);
    particleAnimation(particle5, 2000, 4200);
    particleAnimation(particle6, 2500, 3600);

    // Auto-navigate after 3.5 seconds
    const timer = setTimeout(() => {
      navigation.replace('Home');
    }, 3500);

    return () => {
      clearTimeout(timer);
    };
  }, [navigation]);

  const createParticle = (particle: Animated.Value, icon: string, startPos: any, color: string) => (
    <Animated.View
      style={[
        styles.particle,
        startPos,
        {
          opacity: particle.interpolate({
            inputRange: [0, 0.2, 0.8, 1],
            outputRange: [0, 1, 1, 0],
          }),
          transform: [
            {
              translateY: particle.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -height * 0.3],
              }),
            },
            {
              translateX: particle.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 20, -10],
              }),
            },
            {
              scale: particle.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.3, 1, 0.3],
              }),
            },
            {
              rotate: particle.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              }),
            },
          ],
        },
      ]}
    >
      <Ionicons name={icon as any} size={24} color={color} />
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#0F0F1E', '#1A1A2E', '#0F0F1E', '#000000']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.content}>
          {/* Floating Particles */}
          {createParticle(particle1, 'sparkles', { top: '15%', left: '15%' }, '#00D9FF')}
          {createParticle(particle2, 'color-filter', { top: '20%', right: '20%' }, '#FF00D9')}
          {createParticle(particle3, 'brush', { top: '60%', left: '10%' }, '#D9FF00')}
          {createParticle(particle4, 'color-wand', { top: '70%', right: '15%' }, '#00FFD9')}
          {createParticle(particle5, 'shapes', { top: '40%', left: '8%' }, '#FF6B00')}
          {createParticle(particle6, 'flash', { top: '50%', right: '12%' }, '#00D9FF')}

          {/* Main Logo */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: logoScale },
                  {
                    rotate: logoRotate.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Glow effect */}
            <Animated.View
              style={[
                styles.glow,
                {
                  opacity: glowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 0.8],
                  }),
                  transform: [
                    {
                      scale: glowAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            />

            {/* Icon */}
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={['#00D9FF', '#0099FF', '#0066FF']}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="camera" size={80} color="#FFFFFF" />
              </LinearGradient>
            </View>

            {/* Orbiting Icons */}
            <View style={styles.orbitIcon}>
              <Ionicons name="brush" size={22} color="#FFFFFF" />
            </View>
            <View style={[styles.orbitIcon, styles.orbitIcon2]}>
              <Ionicons name="crop" size={20} color="#FFFFFF" />
            </View>
            <View style={[styles.orbitIcon, styles.orbitIcon3]}>
              <Ionicons name="color-filter" size={20} color="#FFFFFF" />
            </View>
          </Animated.View>

          {/* Title */}
          <Animated.View
            style={[
              styles.titleContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: titleSlide }],
              },
            ]}
          >
            <Text style={styles.title}>Auralite</Text>
          </Animated.View>

          {/* Subtitle */}
          <Animated.View
            style={[
              styles.subtitleContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: subtitleSlide }],
              },
            ]}
          >
            <Text style={styles.subtitle}>The best editing mobile app</Text>
            <View style={styles.featureRow}>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>Transform</Text>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>Create</Text>
              <View style={styles.featureDot} />
              <Text style={styles.featureText}>Enhance</Text>
            </View>
          </Animated.View>

          {/* Loading indicator */}
          <Animated.View
            style={[
              styles.loadingContainer,
              {
                opacity: fadeAnim,
              },
            ]}
          >
            <View style={styles.loadingBar}>
              <Animated.View
                style={[
                  styles.loadingBarFill,
                  {
                    width: glowAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  particle: {
    position: 'absolute',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 40,
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#00D9FF',
    opacity: 0.3,
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
  },
  iconWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbitIcon: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF00D9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF00D9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  orbitIcon2: {
    top: 50,
    right: -15,
    backgroundColor: '#D9FF00',
    shadowColor: '#D9FF00',
  },
  orbitIcon3: {
    top: 105,
    right: -5,
    backgroundColor: '#00FFD9',
    shadowColor: '#00FFD9',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 217, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  subtitleContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  subtitle: {
    fontSize: 15,
    color: '#B0B0B0',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00D9FF',
  },
  featureText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 60,
    width: width * 0.6,
    alignItems: 'center',
  },
  loadingBar: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBarFill: {
    height: '100%',
    backgroundColor: '#00D9FF',
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
});

export default Splash1Screen;
