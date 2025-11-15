import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const { width } = Dimensions.get('window');

// Mock recent projects data
const MOCK_RECENT_PROJECTS = [
  { id: '1', thumbnail: 'https://via.placeholder.com/150', title: 'Project 1' },
  { id: '2', thumbnail: 'https://via.placeholder.com/150', title: 'Project 2' },
  { id: '3', thumbnail: 'https://via.placeholder.com/150', title: 'Project 3' },
  { id: '4', thumbnail: 'https://via.placeholder.com/150', title: 'Project 4' },
  { id: '5', thumbnail: 'https://via.placeholder.com/150', title: 'Project 5' },
  { id: '6', thumbnail: 'https://via.placeholder.com/150', title: 'Project 6' },
];

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Fade in animation on mount
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleImportGallery = () => {
    console.log('Import from gallery pressed');
    // TODO: Implement gallery picker in future phases
  };

  const handleOpenCamera = () => {
    console.log('Open camera pressed');
    // TODO: Implement camera in future phases
  };

  const handleMenuPress = () => {
    console.log('Menu pressed');
    // TODO: Implement menu drawer in future phases
  };

  const handleProfilePress = () => {
    console.log('Profile pressed');
    // TODO: Implement profile screen in future phases
  };

  const handleProjectPress = (projectId: string) => {
    console.log('Project pressed:', projectId);
    // TODO: Navigate to editor screen in future phases
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleMenuPress} style={styles.iconButton}>
          <Ionicons name="menu" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Photo Editor</Text>
        <TouchableOpacity onPress={handleProfilePress} style={styles.iconButton}>
          <Ionicons name="person-circle" size={28} color="#667eea" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Main Action Cards */}
        <Animated.View
          style={[
            styles.actionsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.sectionTitle}>Start Creating</Text>

          <TouchableOpacity
            style={[styles.actionCard, styles.primaryCard]}
            onPress={handleImportGallery}
            activeOpacity={0.8}
          >
            <View style={styles.cardIconContainer}>
              <Ionicons name="images" size={40} color="#ffffff" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Import from Gallery</Text>
              <Text style={styles.cardSubtitle}>
                Select a photo to start editing
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.secondaryCard]}
            onPress={handleOpenCamera}
            activeOpacity={0.8}
          >
            <View style={styles.cardIconContainer}>
              <Ionicons name="camera" size={40} color="#ffffff" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Open Camera</Text>
              <Text style={styles.cardSubtitle}>
                Take a new photo to edit
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#ffffff" />
          </TouchableOpacity>
        </Animated.View>

        {/* Recent Projects Grid */}
        <Animated.View
          style={[
            styles.recentSection,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>Recent Projects</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.projectsGrid}>
            {MOCK_RECENT_PROJECTS.map((project) => (
              <TouchableOpacity
                key={project.id}
                style={styles.projectCard}
                onPress={() => handleProjectPress(project.id)}
                activeOpacity={0.7}
              >
                <View style={styles.projectThumbnail}>
                  <Ionicons name="image" size={40} color="#ccc" />
                </View>
                <Text style={styles.projectTitle} numberOfLines={1}>
                  {project.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  iconButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  actionsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryCard: {
    backgroundColor: '#667eea',
  },
  secondaryCard: {
    backgroundColor: '#f5576c',
  },
  cardIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
  },
  recentSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  projectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  projectCard: {
    width: (width - 60) / 2,
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  projectThumbnail: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#f1f3f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectTitle: {
    padding: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});

export default HomeScreen;
