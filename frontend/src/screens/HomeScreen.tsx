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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { validateImage, getRecentProjects, Project } from '../services';

type HomeScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Home'
>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const { width, height } = Dimensions.get('window');

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const isFocused = useIsFocused();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const plusButtonScale = useRef(new Animated.Value(1)).current;

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState('');

  // Recent projects state
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  
  // Plus button popup state
  const [showPlusPopup, setShowPlusPopup] = useState(false);
  const [showAspectPopup, setShowAspectPopup] = useState(false);

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
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
      const projects = await getRecentProjects(3); // Only need 3 for this design
      setRecentProjects(projects);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoadingProjects(false);
    }
  };

  /**
   * Handle image selection - Creates NEW PROJECT with unique ID
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
    setUploadMessage('Creating new project...');

    try {
      // Create unique project ID
      const projectId = `proj_${Date.now()}`;
      
      console.log('🆕 Creating new project:', projectId);
      
      // Small delay for smooth UX
      setTimeout(() => {
        setUploading(false);
        // Navigate to Editor with NEW PROJECT
        // isNewProject flag tells EditorScreen this is from HomeScreen
        navigation.navigate('Editor', { 
          imageUrl: uri,
          projectId: projectId,
          isNewProject: true,  // 🆕 Flag for new project creation
        });
      }, 300);
    } catch (error: any) {
      console.error('Error creating project:', error);
      setUploading(false);
      Alert.alert(
        'Error',
        'Failed to create project. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Import image from gallery
   */
  const handleImportGallery = async () => {
    console.log('Import from gallery pressed');

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

  const handleFeaturePress = (featureName: string) => {
    Toast.show({
      type: 'info',
      text1: featureName,
      text2: 'Feature coming soon!',
      position: 'top',
    });
  };

  const animatePlusButton = () => {
    Animated.sequence([
      Animated.timing(plusButtonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(plusButtonScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePlusPress = () => {
    animatePlusButton();
    setShowPlusPopup(true);
  };

  /**
   * Open camera to take a photo
   */
  const handleOpenCamera = async () => {
    setShowPlusPopup(false);
    
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera permission to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      await handleImageSelected(result);
    } catch (error: any) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera. Please try again.');
    }
  };

  /**
   * Create blank canvas with selected aspect ratio
   */
  const createBlankCanvas = (aspectRatio: string) => {
    setShowAspectPopup(false);
    
    let canvasWidth = 1080;
    let canvasHeight = 1080;
    
    switch (aspectRatio) {
      case '1:1':
        canvasWidth = 1080;
        canvasHeight = 1080;
        break;
      case '4:3':
        canvasWidth = 1440;
        canvasHeight = 1080;
        break;
      case '3:4':
        canvasWidth = 1080;
        canvasHeight = 1440;
        break;
      case '16:9':
        canvasWidth = 1920;
        canvasHeight = 1080;
        break;
      case '9:16':
        canvasWidth = 1080;
        canvasHeight = 1920;
        break;
      case 'A4':
        canvasWidth = 2480;
        canvasHeight = 3508;
        break;
      default:
        canvasWidth = 1080;
        canvasHeight = 1080;
    }
    
    const projectId = `proj_${Date.now()}`;
    console.log('📐 Creating blank canvas:', aspectRatio, canvasWidth, 'x', canvasHeight);
    
    navigation.navigate('Editor', {
      isBlankCanvas: true,
      canvasWidth,
      canvasHeight,
      projectId,
      isNewProject: true,
    });
  };

  const handleBlankCanvasPress = () => {
    setShowPlusPopup(false);
    setShowAspectPopup(true);
  };

  const handleGalleryPress = () => {
    setShowPlusPopup(false);
    handleImportGallery();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          {/* Title */}
          <Text style={styles.headerTitle}>Auralite</Text>

          {/* Profile Button */}
          <TouchableOpacity
            onPress={handleProfilePress}
            style={styles.profileButton}
            activeOpacity={0.7}
          >
            <Ionicons name="person" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* New Features Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>New features</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.featuresScroll}
              contentContainerStyle={styles.featuresContent}
            >
              <TouchableOpacity
                style={styles.featureCard}
                onPress={() => handleFeaturePress('AI Enhance')}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles" size={32} color="#FFFFFF" />
                <Text style={styles.featureCardText}>AI Enhance</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.featureCard}
                onPress={() => handleFeaturePress('Remove Background')}
                activeOpacity={0.8}
              >
                <Ionicons name="cut" size={32} color="#FFFFFF" />
                <Text style={styles.featureCardText}>Remove BG</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.featureCard}
                onPress={() => handleFeaturePress('Style Transfer')}
                activeOpacity={0.8}
              >
                <Ionicons name="brush" size={32} color="#FFFFFF" />
                <Text style={styles.featureCardText}>Style</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.featureCard}
                onPress={() => handleFeaturePress('Filters')}
                activeOpacity={0.8}
              >
                <Ionicons name="color-filter" size={32} color="#FFFFFF" />
                <Text style={styles.featureCardText}>Filters</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Import from Gallery Section */}
          <Animated.View
            style={[
              styles.importSection,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <TouchableOpacity
              style={styles.importCard}
              onPress={handleImportGallery}
              activeOpacity={0.8}
              disabled={uploading}
            >
              <Ionicons name="images" size={32} color="#FFFFFF" />
              <Text style={styles.importText}>Import from gallery</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Recent Projects Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent projects</Text>

            {loadingProjects ? (
              <View style={styles.projectsLoading}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            ) : recentProjects.length > 0 ? (
              <View style={styles.projectsGrid}>
                {recentProjects.slice(0, 3).map((project) => (
                  <TouchableOpacity
                    key={project.id}
                    style={styles.projectCard}
                    onPress={() => handleProjectPress(project)}
                    activeOpacity={0.7}
                  >
                    {project.thumbnail && project.thumbnail !== 'placeholder' ? (
                      <Image
                        source={{ uri: project.thumbnail }}
                        style={styles.projectThumbnail}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.projectPlaceholder}>
                        <Ionicons name="image" size={40} color="#666666" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.emptyProjects}>
                <Ionicons name="images-outline" size={48} color="#666666" />
                <Text style={styles.emptyProjectsText}>No recent projects</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Floating Plus Button */}
        <Animated.View
          style={[
            styles.plusButtonContainer,
            { transform: [{ scale: plusButtonScale }] },
          ]}
        >
          <TouchableOpacity
            style={styles.plusButton}
            onPress={handlePlusPress}
            activeOpacity={0.8}
            disabled={uploading}
          >
            <Ionicons name="add" size={30} color="#000000" />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Upload Progress Modal */}
      <Modal visible={uploading} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.uploadMessage}>{uploadMessage}</Text>
          </View>
        </View>
      </Modal>

      {/* Plus Button Popup - 3 Options */}
      <Modal visible={showPlusPopup} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.popupOverlay}
          activeOpacity={1}
          onPress={() => setShowPlusPopup(false)}
        >
          <View style={styles.plusPopupContent}>
            <Text style={styles.plusPopupTitle}>Create New</Text>
            
            <TouchableOpacity 
              style={styles.plusPopupOption}
              onPress={handleBlankCanvasPress}
            >
              <View style={[styles.plusPopupIcon, { backgroundColor: '#4CAF50' }]}>
                <Ionicons name="square-outline" size={24} color="#FFF" />
              </View>
              <View style={styles.plusPopupTextContainer}>
                <Text style={styles.plusPopupOptionTitle}>Blank Canvas</Text>
                <Text style={styles.plusPopupOptionDesc}>Start with a clean slate</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.plusPopupOption}
              onPress={handleOpenCamera}
            >
              <View style={[styles.plusPopupIcon, { backgroundColor: '#2196F3' }]}>
                <Ionicons name="camera" size={24} color="#FFF" />
              </View>
              <View style={styles.plusPopupTextContainer}>
                <Text style={styles.plusPopupOptionTitle}>Open Camera</Text>
                <Text style={styles.plusPopupOptionDesc}>Take a new photo</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.plusPopupOption}
              onPress={handleGalleryPress}
            >
              <View style={[styles.plusPopupIcon, { backgroundColor: '#9C27B0' }]}>
                <Ionicons name="images" size={24} color="#FFF" />
              </View>
              <View style={styles.plusPopupTextContainer}>
                <Text style={styles.plusPopupOptionTitle}>Open Photo</Text>
                <Text style={styles.plusPopupOptionDesc}>Import from gallery</Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.plusPopupCancel}
              onPress={() => setShowPlusPopup(false)}
            >
              <Text style={styles.plusPopupCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Aspect Ratio Selection Popup */}
      <Modal visible={showAspectPopup} transparent animationType="fade">
        <TouchableOpacity 
          style={styles.popupOverlay}
          activeOpacity={1}
          onPress={() => setShowAspectPopup(false)}
        >
          <View style={styles.aspectPopupContent}>
            <Text style={styles.plusPopupTitle}>Select Canvas Size</Text>
            
            <View style={styles.aspectGrid}>
              <TouchableOpacity 
                style={styles.aspectOption}
                onPress={() => createBlankCanvas('1:1')}
              >
                <View style={[styles.aspectPreview, { width: 50, height: 50 }]} />
                <Text style={styles.aspectLabel}>1:1</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.aspectOption}
                onPress={() => createBlankCanvas('4:3')}
              >
                <View style={[styles.aspectPreview, { width: 60, height: 45 }]} />
                <Text style={styles.aspectLabel}>4:3</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.aspectOption}
                onPress={() => createBlankCanvas('3:4')}
              >
                <View style={[styles.aspectPreview, { width: 45, height: 60 }]} />
                <Text style={styles.aspectLabel}>3:4</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.aspectOption}
                onPress={() => createBlankCanvas('16:9')}
              >
                <View style={[styles.aspectPreview, { width: 70, height: 40 }]} />
                <Text style={styles.aspectLabel}>16:9</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.aspectOption}
                onPress={() => createBlankCanvas('9:16')}
              >
                <View style={[styles.aspectPreview, { width: 40, height: 70 }]} />
                <Text style={styles.aspectLabel}>9:16</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.aspectOption}
                onPress={() => createBlankCanvas('A4')}
              >
                <View style={[styles.aspectPreview, { width: 45, height: 64 }]} />
                <Text style={styles.aspectLabel}>A4</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.plusPopupCancel}
              onPress={() => setShowAspectPopup(false)}
            >
              <Text style={styles.plusPopupCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 27,
    paddingBottom: 20,
  },
  headerTitle: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileButton: {
    width: 51,
    height: 51,
    borderRadius: 25.5,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  featuresScroll: {
    marginLeft: -20,
  },
  featuresContent: {
    paddingHorizontal: 20,
    gap: 19,
  },
  featureCard: {
    width: 121,
    height: 164,
    backgroundColor: '#242428',
    borderRadius: 10,
    borderWidth: 0.2,
    borderColor: '#605757',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  featureCardText: {
    marginTop: 12,
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  importSection: {
    paddingHorizontal: 20,
    marginTop: 33,
  },
  importCard: {
    width: '100%',
    height: 254,
    backgroundColor: '#242428',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  importText: {
    marginTop: 16,
    fontFamily: 'System',
    fontSize: 20,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  projectsGrid: {
    flexDirection: 'row',
    gap: 27,
  },
  projectCard: {
    width: 110,
    height: 110,
    backgroundColor: '#242428',
    borderRadius: 10,
    overflow: 'hidden',
  },
  projectThumbnail: {
    width: '100%',
    height: '100%',
  },
  projectPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectsLoading: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyProjects: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyProjectsText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
  },
  plusButtonContainer: {
    position: 'absolute',
    bottom: 21,
    alignSelf: 'center',
    zIndex: 10,
  },
  plusButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D9D9D9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#242428',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    minWidth: 200,
  },
  uploadMessage: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  // Plus Popup Styles
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusPopupContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 24,
    width: width - 48,
    maxWidth: 340,
  },
  plusPopupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  plusPopupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  plusPopupIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  plusPopupTextContainer: {
    flex: 1,
  },
  plusPopupOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  plusPopupOptionDesc: {
    fontSize: 13,
    color: '#8E8E93',
  },
  plusPopupCancel: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  plusPopupCancelText: {
    fontSize: 16,
    color: '#FF453A',
    fontWeight: '500',
  },
  // Aspect Ratio Popup Styles
  aspectPopupContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 24,
    width: width - 48,
    maxWidth: 340,
  },
  aspectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  aspectOption: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  aspectPreview: {
    backgroundColor: '#3A3A3C',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#48484A',
  },
  aspectLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default HomeScreen;
