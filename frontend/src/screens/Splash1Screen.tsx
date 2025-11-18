/**
 * Splash Screen - Clean and Simple Intro
 *
 * Features: Smooth fade-in animation only
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
  const skipOpacity = useRef(new Animated.Value(0)).current;

  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    // Simple clean animation
    Animated.parallel([
      // Fade in logo and title
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      // Skip button fade in
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(skipOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
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

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        {/* Logo Container */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Logo Icon */}
          <View style={styles.iconWrapper}>
            <Ionicons name="camera" size={80} color="#00D9FF" />
          </View>

          {/* Title */}
          <Text style={styles.title}>AI Photo Editor</Text>
          <Text style={styles.subtitle}>Professional Editing Powered by AI</Text>
        </Animated.View>

        {/* Simple Skip Button */}
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
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip</Text>
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
  logoContainer: {
    alignItems: 'center',
  },
  iconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 217, 255, 0.3)',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 24,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#B0B0B0',
    marginTop: 8,
    textAlign: 'center',
  },
  skipContainer: {
    position: 'absolute',
    bottom: 60,
    right: 24,
  },
  skipButton: {
    backgroundColor: '#00D9FF',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 6,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
});

export default Splash1Screen;
