/**
 * Simplified Add Menu Modal - Auralite Design
 *
 * Import new picture with camera/gallery options
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
              <Text style={styles.headerTitle}>Import new picture</Text>
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {/* Open Camera */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={onOpenCamera}
                activeOpacity={0.7}
              >
                <Ionicons name="camera" size={32} color="#FFFFFF" />
                <Text style={styles.optionText}>Open Camera</Text>
              </TouchableOpacity>

              {/* Import from gallery */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={onImportGallery}
                activeOpacity={0.7}
              >
                <Ionicons name="images" size={32} color="#FFFFFF" />
                <Text style={styles.optionText}>Import from gallery</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#242428',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  header: {
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  optionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  optionCard: {
    width: '100%',
    height: 80,
    backgroundColor: '#323232',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default SimplifiedAddMenuModal;
