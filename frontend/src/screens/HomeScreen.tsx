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
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { validateImage, getRecentProjects, Project } from '../services';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

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
  const headerFade = useRef(new Animated.Value(0)).current;
  const titleSlide = useRef(new Animated.Value(-20)).current;

  // Card animations with stagger
  const galleryFade = useRef(new Animated.Value(0)).current;
  const gallerySlide = useRef(new Animated.Value(40)).current;
  const galleryScaleAnim = useRef(new Animated.Value(1)).current;

  const cameraFade = useRef(new Animated.Value(0)).current;
  const cameraSlide = useRef(new Animated.Value(40)).current;
  const cameraScaleAnim = useRef(new Animated.Value(1)).current;

  const blankFade = useRef(new Animated.Value(0)).current;
  const blankSlide = useRef(new Animated.Value(40)).current;
  const blankCanvasScaleAnim = useRef(new Animated.Value(1)).current;

  const recentFade = useRef(new Animated.Value(0)).current;
  const recentSlide = useRef(new Animated.Value(40)).current;

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');

  // Recent projects state
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  useEffect(() => {
    // Sophisticated staggered entrance animations
    Animated.sequence([
      // Header appears first
      Animated.parallel([
        Animated.timing(headerFade, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(titleSlide, {
          toValue: 0,
          friction: 10,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),
      // Then section title
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 10,
          tension: 50,
          useNativeDriver: true,
        }),
      ]),
      // Then cards in staggered sequence
      Animated.stagger(120, [
        // Gallery card
        Animated.parallel([
          Animated.timing(galleryFade, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(gallerySlide, {
            toValue: 0,
            friction: 9,
            tension: 45,
            useNativeDriver: true,
          }),
        ]),
        // Camera card
        Animated.parallel([
          Animated.timing(cameraFade, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(cameraSlide, {
            toValue: 0,
            friction: 9,
            tension: 45,
            useNativeDriver: true,
          }),
        ]),
        // Blank canvas card
        Animated.parallel([
          Animated.timing(blankFade, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(blankSlide, {
            toValue: 0,
            friction: 9,
            tension: 45,
            useNativeDriver: true,
          }),
        ]),
        // Recent projects section
        Animated.parallel([
          Animated.timing(recentFade, {
            toValue: 1,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.spring(recentSlide, {
            toValue: 0,
            friction: 9,
            tension: 45,
            useNativeDriver: true,
          }),
        ]),
      ]),
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
   * Handle image selection - LOCAL ONLY (No cloud upload)
   */
  const handleImageSelected = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    const { uri, fileSize, mimeType } = asset;

    console.log('Image selected (local):', { uri, fileSize, mimeType });

    // Validate image
    const validation = validateImage(uri, fileSize, mimeType);
    if (!validation.valid) {
      Alert.alert('Invalid Image', validation.error || 'Please select a valid image');
      return;
    }

    // Show brief loading message
    setUploading(true);
    setUploadMessage('Opening editor...');

    try {
      // Small delay for smooth UX
      setTimeout(() => {
        setUploading(false);
        // Navigate to Editor with LOCAL URI (no cloud upload!)
        navigation.navigate('Editor', { imageUrl: uri });
      }, 300);
    } catch (error: any) {
      console.error('Error opening editor:', error);
      setUploading(false);
      Alert.alert(
        'Error',
        'Failed to open editor. Please try again.',
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
    Toast.show({
      type: 'info',
      text1: '☰ Menu',
      text2: 'Menu feature coming soon!',
      position: 'top',
      visibilityTime: 2000,
    });
  };

  const handleProfilePress = () => {
    console.log('Profile pressed');
    Toast.show({
      type: 'info',
      text1: '👤 Profile',
      text2: 'Profile feature coming soon!',
      position: 'top',
      visibilityTime: 2000,
    });
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
      {/* Header with Animation */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerFade,
            transform: [{ translateY: titleSlide }],
          },
        ]}
      >
        <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
          <View style={styles.menuLines}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Photo Editor</Text>
        <TouchableOpacity onPress={handleProfilePress} style={styles.profileButton}>
          <View style={styles.profileCircle}>
            <Ionicons name="person" size={24} color={COLORS.textPrimary} />
          </View>
        </TouchableOpacity>
      </Animated.View>

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

          <Animated.View
            style={{
              opacity: galleryFade,
              transform: [
                { scale: galleryScaleAnim },
                { translateY: gallerySlide },
              ],
            }}
          >
            <TouchableOpacity
              onPress={handleImportGallery}
              activeOpacity={0.8}
              disabled={uploading}
            >
              <LinearGradient
                colors={['#2A2A3E', '#1F1F2E', '#1A1A24']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionCardLarge}
              >
                <View style={styles.cardIconContainerLarge}>
                  <LinearGradient
                    colors={['#00D9FF', '#0099FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconGradient}
                  >
                    <Ionicons name="images" size={56} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitleLarge}>Import from Gallery</Text>
                  <Text style={styles.cardSubtitleLarge}>
                    Select a photo to start editing
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={28} color={COLORS.textSecondary} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={{
              opacity: cameraFade,
              transform: [
                { scale: cameraScaleAnim },
                { translateY: cameraSlide },
              ],
            }}
          >
            <TouchableOpacity
              onPress={handleOpenCamera}
              activeOpacity={0.8}
              disabled={uploading}
            >
              <LinearGradient
                colors={['#2A2A3E', '#1F1F2E', '#1A1A24']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionCardStandard}
              >
                <View style={styles.cardIconContainerStandard}>
                  <LinearGradient
                    colors={['#FF00D9', '#CC00AA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconGradientSmall}
                  >
                    <Ionicons name="camera" size={32} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Open Camera</Text>
                  <Text style={styles.cardSubtitle}>
                    Take a new photo to edit
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={{
              opacity: blankFade,
              transform: [
                { scale: blankCanvasScaleAnim },
                { translateY: blankSlide },
              ],
            }}
          >
            <TouchableOpacity
              onPress={handleBlankCanvas}
              activeOpacity={0.8}
              disabled={uploading}
            >
              <LinearGradient
                colors={['#2A2A3E', '#1F1F2E', '#1A1A24']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionCardStandard}
              >
                <View style={styles.cardIconContainerStandard}>
                  <LinearGradient
                    colors={['#D9FF00', '#AACC00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.iconGradientSmall}
                  >
                    <Ionicons name="create" size={32} color="#000000" />
                  </LinearGradient>
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Blank Canvas</Text>
                  <Text style={styles.cardSubtitle}>
                    Start creating from scratch
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>

        {/* Recent Projects Grid */}
        <Animated.View
          style={[
            styles.recentSection,
            {
              opacity: recentFade,
              transform: [{ translateY: recentSlide }],
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
              <ActivityIndicator size="small" color={COLORS.primary} />
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
                      <Ionicons name="image" size={40} color={COLORS.textTertiary} />
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
              <Ionicons name="images-outline" size={48} color={COLORS.textTertiary} />
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
            <ActivityIndicator size="large" color={COLORS.primary} />
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

      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 217, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  menuButton: {
    padding: 5,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  menuLines: {
    gap: 6,
  },
  menuLine: {
    width: 30,
    height: 1,
    backgroundColor: COLORS.textPrimary,
  },
  profileButton: {
    padding: 5,
  },
  profileCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  actionsContainer: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  actionCardLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.xl,
    paddingVertical: 28,
    minHeight: 140,
    borderRadius: 28,
    marginBottom: SPACING.lg,
    shadowColor: '#00D9FF',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.15)',
  },
  actionCardStandard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    paddingVertical: 16,
    minHeight: 80,
    borderRadius: 20,
    marginBottom: SPACING.md,
    shadowColor: '#FF00D9',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 217, 0.1)',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.xl,
    paddingVertical: 24,
    minHeight: 100,
    borderRadius: 30,
    marginBottom: SPACING.md,
    backgroundColor: '#323232',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  cardIconContainerLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    marginRight: SPACING.lg,
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  iconGradient: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconContainerStandard: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    marginRight: SPACING.md,
    shadowColor: '#FF00D9',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  iconGradientSmall: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  cardContent: {
    flex: 1,
  },
  cardTitleLarge: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  cardSubtitleLarge: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  cardTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  recentSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 10,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  seeAllText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  projectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  projectCard: {
    width: (width - 60) / 2,
    height: 110,
    marginBottom: SPACING.md,
    backgroundColor: '#2A2A3E',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#00D9FF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.1)',
  },
  projectThumbnail: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectTitle: {
    padding: 12,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
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
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  emptyProjects: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyProjectsText: {
    marginTop: 12,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptyProjectsSubtext: {
    marginTop: 4,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    width: width * 0.8,
    maxWidth: 320,
  },
  uploadMessage: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 4,
    marginTop: SPACING.lg,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    marginTop: 12,
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});

export default HomeScreen;
