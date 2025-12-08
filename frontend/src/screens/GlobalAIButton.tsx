/**
 * Global AI Button with Inline Chat Expansion
 * Gemini-style inline expansion animation
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  Keyboard,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface GlobalAIButtonProps {
  bottom: Animated.Value; // Animated bottom position (adjusts with panels)
  onSendPrompt: (prompt: string) => void;
  isProcessing: boolean;
  onStop?: () => void;
}

const GlobalAIButton: React.FC<GlobalAIButtonProps> = ({
  bottom,
  onSendPrompt,
  isProcessing,
  onStop,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  // Animated values
  const aiButtonScale = useRef(new Animated.Value(1)).current;
  const aiChatInlineWidth = useRef(new Animated.Value(50)).current; // Start with button width
  const aiChatInlineOpacity = useRef(new Animated.Value(0)).current; // For TextInput + buttons

  // Bounce animation on tap
  const animateBounce = () => {
    Animated.sequence([
      Animated.spring(aiButtonScale, {
        toValue: 0.85,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(aiButtonScale, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Expand animation
  const expandInline = () => {
    setIsExpanded(true);

    Animated.parallel([
      // Expand width
      Animated.timing(aiChatInlineWidth, {
        toValue: 320, // Full expanded width
        duration: 260,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Cubic easing
        useNativeDriver: false,
      }),
      // Fade in content
      Animated.timing(aiChatInlineOpacity, {
        toValue: 1,
        duration: 200,
        delay: 60, // Slight delay for smoother appearance
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Collapse animation
  const collapseInline = () => {
    Keyboard.dismiss();

    Animated.parallel([
      // Fade out content first
      Animated.timing(aiChatInlineOpacity, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      // Collapse width
      Animated.timing(aiChatInlineWidth, {
        toValue: 50, // Back to button width
        duration: 260,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: false,
      }),
    ]).start(() => {
      setIsExpanded(false);
      setAiPrompt('');
    });
  };

  // Handle button tap
  const handleAIButtonTap = () => {
    animateBounce();

    if (isExpanded) {
      collapseInline();
    } else {
      expandInline();
    }
  };

  // Handle send
  const handleSend = () => {
    if (aiPrompt.trim() && !isProcessing) {
      onSendPrompt(aiPrompt.trim());
      setAiPrompt('');
    }
  };

  // Handle stop
  const handleStop = () => {
    if (onStop) {
      onStop();
    }
  };

  return (
    <Animated.View
      style={[
        styles.aiButtonContainer,
        {
          bottom: bottom,
        },
      ]}
    >
      {/* Expandable Inline Container */}
      <Animated.View
        style={[
          styles.inlineContainer,
          {
            width: aiChatInlineWidth,
          },
        ]}
      >
        {/* AI Button (Always visible on left) */}
        <Animated.View
          style={[
            styles.aiButtonWrapper,
            {
              transform: [{ scale: aiButtonScale }],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.aiButton}
            onPress={handleAIButtonTap}
            activeOpacity={0.8}
          >
            <Ionicons
              name="sparkles"
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Expanded Content (TextInput + Buttons) */}
        {isExpanded && (
          <Animated.View
            style={[
              styles.expandedContent,
              {
                opacity: aiChatInlineOpacity,
              },
            ]}
          >
            {/* Text Input */}
            <TextInput
              style={styles.aiInput}
              placeholder="Ask AI to edit..."
              placeholderTextColor="#888888"
              value={aiPrompt}
              onChangeText={setAiPrompt}
              multiline={false}
              autoFocus={true}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {isProcessing ? (
                // Stop button when processing
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleStop}
                  activeOpacity={0.7}
                >
                  <Ionicons name="stop-circle" size={22} color="#FF453A" />
                </TouchableOpacity>
              ) : (
                // Send button when not processing
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    !aiPrompt.trim() && styles.actionButtonDisabled,
                  ]}
                  onPress={handleSend}
                  activeOpacity={0.7}
                  disabled={!aiPrompt.trim()}
                >
                  <Ionicons
                    name="send"
                    size={20}
                    color={aiPrompt.trim() ? '#00D9FF' : '#555555'}
                  />
                </TouchableOpacity>
              )}

              {/* Close button */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={collapseInline}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  aiButtonContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 20,
    // bottom is animated via props
  },
  inlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242428',
    borderRadius: 30,
    height: 50,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  aiButtonWrapper: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00D9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingRight: 8,
  },
  aiInput: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 8,
    height: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    marginRight: 8,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
});

export default GlobalAIButton;
