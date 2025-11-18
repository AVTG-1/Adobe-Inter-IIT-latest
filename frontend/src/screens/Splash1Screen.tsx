/**
 * Splash Screen - Creative Photo Editor Intro
 *
 * Features: Editing-themed animations, floating elements, large animated Skip button
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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const skipButtonSlide = useRef(new Animated.Value(100)).current;
  const skipButtonPulse = useRef(new Animated.Value(1)).current;

  // Editing elements animations
  const spark1 = useRef(new Animated.Value(0)).current;
  const spark2 = useRef(new Animated.Value(0)).current;
  const spark3 = useRef(new Animated.Value(0)).current;
  const photoFrame = useRef(new Animated.Value(0)).current;
  const brushStroke = useRef(new Animated.Value(0)).current;

  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    // Main animation sequence
    Animated.parallel([
      // Logo entrance
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        // Logo subtle pulse
        Animated.loop(
          Animated.sequence([
            Animated.timing(logoScale, {
              toValue: 1.05,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(logoScale, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ),
      ]),
      // Fade in everything
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // Sparks floating animation
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(spark1, {
              toValue: 1,
              duration: 3000,
              useNativeDriver: true,
            }),
            Animated.timing(spark1, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(600),
            Animated.timing(spark2, {
              toValue: 1,
              duration: 3200,
              useNativeDriver: true,
            }),
            Animated.timing(spark2, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(1200),
            Animated.timing(spark3, {
              toValue: 1,
              duration: 2800,
              useNativeDriver: true,
            }),
            Animated.timing(spark3, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
        ])
      ),
      // Photo frame rotation
      Animated.loop(
        Animated.timing(photoFrame, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        })
      ),
      // Brush stroke animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(brushStroke, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(brushStroke, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ),
      // Skip button slide up
      Animated.spring(skipButtonSlide, {
        toValue: 0,
        delay: 500,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Skip button pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(skipButtonPulse, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(skipButtonPulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Auto-navigate after 3 seconds if not skipped
    const timer = setTimeout(() => {
      if (!skipped) {
        navigation.replace('Home');
      }
    }, 3000);

    return () => {
      clearTimeout(timer);
      pulseAnimation.stop();
    };
  }, [navigation, skipped]);

  const handleSkip = () => {
    setSkipped(true);
    navigation.replace('Home');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        {/* Floating Spark Elements */}
        <Animated.View
          style={[
            styles.spark,
            {
              top: '15%',
              left: '20%',
              opacity: spark1.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 1, 0],
              }),
              transform: [
                {
                  translateY: spark1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -60],
                  }),
                },
                {
                  scale: spark1.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.5, 1, 0.5],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="sparkles" size={24} color="#00D9FF" />
        </Animated.View>

        <Animated.View
          style={[
            styles.spark,
            {
              top: '25%',
              right: '15%',
              opacity: spark2.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 1, 0],
              }),
              transform: [
                {
                  translateY: spark2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -70],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="flash" size={20} color="#00D9FF" />
        </Animated.View>

        <Animated.View
          style={[
            styles.spark,
            {
              top: '70%',
              left: '15%',
              opacity: spark3.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, 1, 0],
              }),
              transform: [
                {
                  translateY: spark3.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -50],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="color-wand" size={22} color="#00D9FF" />
        </Animated.View>

        {/* Photo Frame Element */}
        <Animated.View
          style={[
            styles.photoFrame,
            {
              opacity: fadeAnim,
              transform: [
                {
                  rotate: photoFrame.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.frameInner} />
        </Animated.View>

        {/* Brush Stroke Element */}
        <Animated.View
          style={[
            styles.brushStroke,
            {
              opacity: brushStroke.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.3, 0.6, 0.3],
              }),
              transform: [
                {
                  scaleX: brushStroke.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                },
              ],
            },
          ]}
        />

        {/* Main Logo Container */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          {/* Camera Icon */}
          <View style={styles.iconWrapper}>
            <Ionicons name="camera" size={70} color="#00D9FF" />
          </View>

          {/* Editing Icons Around Camera */}
          <View style={styles.orbitIcon} pointerEvents="none">
            <Ionicons name="brush" size={20} color="#FFFFFF" />
          </View>
          <View style={[styles.orbitIcon, styles.orbitIcon2]} pointerEvents="none">
            <Ionicons name="crop" size={18} color="#FFFFFF" />
          </View>
          <View style={[styles.orbitIcon, styles.orbitIcon3]} pointerEvents="none">
            <Ionicons name="color-filter" size={18} color="#FFFFFF" />
          </View>

          {/* Title */}
          <Text style={styles.title}>AI Photo Editor</Text>
          <Text style={styles.subtitle}>Professional Editing Powered by AI</Text>
        </Animated.View>

        {/* Large Animated Skip Button */}
        <Animated.View
          style={[
            styles.skipContainer,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: skipButtonSlide },
                { scale: skipButtonPulse },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.8}
          >
            <View style={styles.skipButtonInner}>
              <Text style={styles.skipText}>Skip</Text>
              <View style={styles.skipArrow}>
                <Ionicons name="arrow-forward" size={20} color="#000000" />
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spark: {
    position: 'absolute',
  },
  photoFrame: {
    position: 'absolute',
    top: '20%',
    right: '10%',
    width: 80,
    height: 80,
    borderWidth: 3,
    borderColor: 'rgba(0, 217, 255, 0.3)',
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  frameInner: {
    flex: 1,
    margin: 8,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderRadius: 4,
  },
  brushStroke: {
    position: 'absolute',
    bottom: '35%',
    left: '10%',
    width: 100,
    height: 4,
    backgroundColor: '#00D9FF',
    borderRadius: 2,
  },
  logoContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  iconWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 217, 255, 0.4)',
    marginBottom: 8,
  },
  orbitIcon: {
    position: 'absolute',
    top: 0,
    right: -10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbitIcon2: {
    top: 40,
    right: -25,
  },
  orbitIcon3: {
    top: 80,
    right: -10,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#B0B0B0',
    marginTop: 6,
    textAlign: 'center',
  },
  skipContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
  },
  skipButton: {
    backgroundColor: '#00D9FF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#00D9FF',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  skipButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
  },
  skipText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 1,
  },
  skipArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Splash1Screen;
