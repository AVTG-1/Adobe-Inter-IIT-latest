/**
 * Splash Screen - Dark with Logo Animation
 *
 * Logo animation: fade-in (0.5s) → stay (1s) → fade-out (0.5s) → Home
 * Total duration: 2 seconds
 */

import React, { useEffect, useRef } from 'react';
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
  const logoAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo animation: fade-in (0.5s) → stay (1s) → fade-out (0.5s)
    Animated.sequence([
      // Fade in over 500ms
      Animated.timing(logoAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Stay visible for 1000ms (delay)
      Animated.delay(1000),
      // Fade out over 500ms
      Animated.timing(logoAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Navigate to Home after animation completes
      navigation.replace('Home');
    });
  }, [navigation]);

  const handleSkip = () => {
    navigation.replace('Home');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.content}>
        <Animated.View style={[styles.logoContainer, { opacity: logoAnim }]}>
          <Ionicons name="images" size={80} color="#00D9FF" />
          <Text style={styles.title}>AI Photo Editor</Text>
          <Text style={styles.subtitle}>Powered by Adobe</Text>
        </Animated.View>

        {/* Skip Button */}
        <View style={styles.skipContainer}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.8}
          >
            <Text style={styles.skipText}>Skip</Text>
            <View style={styles.skipIconContainer}>
              <Ionicons name="chevron-forward" size={20} color="#000000" />
            </View>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 24,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#B0B0B0',
    marginTop: 8,
    letterSpacing: 1,
  },
  skipContainer: {
    width: '100%',
    paddingHorizontal: 10,
  },
  skipButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  skipText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  skipIconContainer: {
    width: 34,
    height: 34,
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default Splash1Screen;
