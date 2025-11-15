import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToGCS, validateImage, UploadProgress, getRecentProjects, Project } from '../services';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const { width } = Dimensions.get('window');

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const isFocused = useIsFocused();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const galleryScaleAnim = useRef(new Animated.Value(1)).current;
  const cameraScaleAnim = useRef(new Animated.Value(1)).current;
  const blankCanvasScaleAnim = useRef(new Animated.Value(1)).current;

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');

  // Recent projects state
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

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

  // Load recent projects when screen comes into focus
  useEffect(() => {
    if (isFocused) {
      loadRecentProjects();
    }
  }, [isFocused]);

  const loadRecentProjects = async () => {
    try {
      setLoadingProjects(true);
      const projects = await getRecentProjects(6);
      setRecentProjects(projects);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  /**
   * Handle image selection and upload
   */
  const handleImageSelected = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const { uri, fileSize, mimeType } = asset;

    console.log('Image selected:', { uri, fileSize, mimeType });

    // Validate image
    const validation = validateImage(uri, fileSize, mimeType);
    if (!validation.valid) {
      Alert.alert('Invalid Image', validation.error || 'Please select a valid image');
      return;
    }

    // Show loading and start upload
    setUploading(true);
    setUploadProgress(0);
    setUploadMessage('Uploading image to cloud storage...');

    try {
      // Upload to GCS
      const uploadResult = await uploadImageToGCS(
        uri,
        'uploads',
        (progress: UploadProgress) => {
          setUploadProgress(progress.progress);
          console.log('Upload progress:', progress.progress.toFixed(1) + '%');
        }
      );

      if (uploadResult.success && uploadResult.url) {
        console.log('Upload successful! GCS URL:', uploadResult.url);
        setUploadMessage('Upload complete! Opening editor...');

        // Wait a bit to show success message
        setTimeout(() => {
          setUploading(false);
          // Navigate to Editor with GCS URL
          navigation.navigate('Editor', { imageUrl: uploadResult.url! });
        }, 500);
      } else {
        throw new Error(uploadResult.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploading(false);
      Alert.alert(
        'Upload Failed',
        error.message || 'Failed to upload image. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Import image from gallery
   */
  const handleImportGallery = async () => {
    console.log('Import from gallery pressed');

    // Animate button press
    Animated.sequence([
      Animated.timing(galleryScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(galleryScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photo library to import images.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
        exif: false,
      });

      await handleImageSelected(result);
    } catch (error: any) {
      console.error('Gallery picker error:', error);
      Alert.alert('Error', 'Failed to open gallery. Please try again.');
    }
  };

  /**
   * Capture image from camera
   */
  const handleOpenCamera = async () => {
    console.log('Open camera pressed');

    // Animate button press
    Animated.sequence([
      Animated.timing(cameraScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(cameraScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your camera to take photos.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
        exif: false,
      });

      await handleImageSelected(result);
    } catch (error: any) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  /**
   * Start editing with a blank canvas
   */
  const handleBlankCanvas = () => {
    console.log('Blank canvas pressed');

    // Animate button press
    Animated.sequence([
      Animated.timing(blankCanvasScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(blankCanvasScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to Editor with blank canvas
    const canvasSize = Math.min(width, 800); // Use device width or 800px, whichever is smaller
    navigation.navigate('Editor', {
      isBlankCanvas: true,
      canvasWidth: canvasSize,
      canvasHeight: canvasSize,
    });
  };

  const handleMenuPress = () => {
    console.log('Menu pressed');
    // TODO: Implement menu drawer in future phases
  };

  const handleProfilePress = () => {
    console.log('Profile pressed');
    // TODO: Implement profile screen in future phases
  };

  const handleProjectPress = (project: Project) => {
    console.log('Project pressed:', project.id);
    // Navigate to editor with the project's image
    navigation.navigate('Editor', {
      imageUrl: project.imageUrl,
      isBlankCanvas: project.isBlankCanvas,
    });
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

          <Animated.View style={{ transform: [{ scale: galleryScaleAnim }] }}>
            <TouchableOpacity
              style={[styles.actionCard, styles.primaryCard]}
              onPress={handleImportGallery}
              activeOpacity={0.8}
              disabled={uploading}
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
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: cameraScaleAnim }] }}>
            <TouchableOpacity
              style={[styles.actionCard, styles.secondaryCard]}
              onPress={handleOpenCamera}
              activeOpacity={0.8}
              disabled={uploading}
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

          <Animated.View style={{ transform: [{ scale: blankCanvasScaleAnim }] }}>
            <TouchableOpacity
              style={[styles.actionCard, styles.tertiaryCard]}
              onPress={handleBlankCanvas}
              activeOpacity={0.8}
              disabled={uploading}
            >
              <View style={styles.cardIconContainer}>
                <Ionicons name="create" size={40} color="#ffffff" />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Blank Canvas</Text>
                <Text style={styles.cardSubtitle}>
                  Start creating from scratch
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#ffffff" />
            </TouchableOpacity>
          </Animated.View>
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

          {loadingProjects ? (
            <View style={styles.projectsLoading}>
              <ActivityIndicator size="small" color="#667eea" />
              <Text style={styles.loadingProjectsText}>Loading projects...</Text>
            </View>
          ) : recentProjects.length > 0 ? (
            <View style={styles.projectsGrid}>
              {recentProjects.map((project) => (
                <TouchableOpacity
                  key={project.id}
                  style={styles.projectCard}
                  onPress={() => handleProjectPress(project)}
                  activeOpacity={0.7}
                >
                  <View style={styles.projectThumbnail}>
                    {project.thumbnail && project.thumbnail !== 'placeholder' ? (
                      <Image
                        source={{ uri: project.thumbnail }}
                        style={styles.projectThumbnailImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="image" size={40} color="#ccc" />
                    )}
                  </View>
                  <Text style={styles.projectTitle} numberOfLines={1}>
                    {project.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyProjects}>
              <Ionicons name="images-outline" size={48} color="#ccc" />
              <Text style={styles.emptyProjectsText}>No recent projects</Text>
              <Text style={styles.emptyProjectsSubtext}>
                Start creating to see your work here
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Upload Progress Modal */}
      <Modal visible={uploading} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.uploadMessage}>{uploadMessage}</Text>
            <View style={styles.progressBarContainer}>
              <View
                style={[styles.progressBar, { width: `${uploadProgress}%` }]}
              />
            </View>
            <Text style={styles.progressText}>
              {uploadProgress.toFixed(0)}%
            </Text>
          </View>
        </View>
      </Modal>
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
  tertiaryCard: {
    backgroundColor: '#4facfe',
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
  projectThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  projectsLoading: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingProjectsText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  emptyProjects: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyProjectsText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  emptyProjectsSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#ccc',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: width * 0.8,
    maxWidth: 320,
  },
  uploadMessage: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 4,
  },
  progressText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea',
  },
});

export default HomeScreen;
