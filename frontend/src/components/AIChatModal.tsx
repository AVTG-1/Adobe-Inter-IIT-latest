/**
 * AI Chat Modal - Full Screen Chat Interface
 *
 * Interactive AI chat for image editing commands
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '../config/theme';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface AIChatModalProps {
  visible: boolean;
  onClose: () => void;
}

const QUICK_PROMPTS = [
  'Make this photo cinematic',
  'Remove background',
  'Enhance colors',
  'Make it look professional',
  'Add vintage filter',
  'Fix lighting',
];

const AIChatModal: React.FC<AIChatModalProps> = ({ visible, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m your AI photo editing assistant. Tell me what you\'d like to do with your image, and I\'ll help you achieve it.',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = () => {
    if (!inputText.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: `I'll help you with "${inputText}". Processing your request...`,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 1000);

    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputText(prompt);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <View style={styles.statusIndicator}>
              <View style={styles.onlineDot} />
              <Text style={styles.headerSubtitle}>Online</Text>
            </View>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="sparkles" size={28} color={COLORS.primary} />
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.isUser ? styles.userBubble : styles.aiBubble,
              ]}
            >
              {!message.isUser && (
                <View style={styles.aiAvatar}>
                  <Ionicons name="sparkles" size={16} color={COLORS.primary} />
                </View>
              )}
              <View
                style={[
                  styles.messageContent,
                  message.isUser ? styles.userMessageContent : styles.aiMessageContent,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.isUser ? styles.userMessageText : styles.aiMessageText,
                  ]}
                >
                  {message.text}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Quick Prompts */}
        <View style={styles.quickPromptsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickPromptsContent}
          >
            {QUICK_PROMPTS.map((prompt, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickPromptChip}
                onPress={() => handleQuickPrompt(prompt)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickPromptText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Input Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Type your editing request..."
                placeholderTextColor={COLORS.textTertiary}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !inputText.trim() && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!inputText.trim()}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="send"
                  size={20}
                  color={inputText.trim() ? '#000' : COLORS.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  closeButton: {
    padding: SPACING.sm,
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  headerSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  headerIcon: {
    padding: SPACING.sm,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    maxWidth: '85%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  aiBubble: {
    alignSelf: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  messageContent: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  userMessageContent: {
    backgroundColor: COLORS.primary,
  },
  aiMessageContent: {
    backgroundColor: COLORS.surface,
  },
  messageText: {
    fontSize: FONT_SIZES.md,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#000',
  },
  aiMessageText: {
    color: COLORS.textPrimary,
  },
  quickPromptsContainer: {
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  quickPromptsContent: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  quickPromptChip: {
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickPromptText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
  },
  inputContainer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.surface,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES.md,
    color: COLORS.textPrimary,
    maxHeight: 100,
    paddingRight: SPACING.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.card,
  },
});

export default AIChatModal;
