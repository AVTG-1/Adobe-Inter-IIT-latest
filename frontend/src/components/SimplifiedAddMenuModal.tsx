/**
 * Simplified Add Menu Modal - Clean Import UI
 *
 * ONLY 2 OPTIONS:
 * 1. Open Camera - Take a new photo
 * 2. Import from Gallery - Select existing photo
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface SimplifiedAddMenuModalProps {
  visible: boolean;
  onOpenCamera: () => void;
  onImportGallery: () => void;
  onClose: () => void;
}

const SimplifiedAddMenuModal: React.FC<SimplifiedAddMenuModalProps> = ({
  visible,
  onOpenCamera,
  onImportGallery,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          <TouchableOpacity activeOpacity={1}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Add Photo</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Two Options */}
            <View style={styles.optionsContainer}>
              {/* Open Camera */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={onOpenCamera}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#007AFF' }]}>
                  <Ionicons name="camera" size={32} color="#FFFFFF" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Take Photo</Text>
                  <Text style={styles.optionSubtitle}>Use camera to capture new image</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#555" />
              </TouchableOpacity>

              {/* Import from Gallery */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={onImportGallery}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: '#34C759' }]}>
                  <Ionicons name="images" size={32} color="#FFFFFF" />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Import from Gallery</Text>
                  <Text style={styles.optionSubtitle}>Choose photo from your library</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#555" />
              </TouchableOpacity>
            </View>

            {/* Helper text */}
            <Text style={styles.helperText}>
              First photo becomes background • Additional photos create new layers
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    zIndex:1000,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  optionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 13,
    color: '#888',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
});

export default SimplifiedAddMenuModal;
