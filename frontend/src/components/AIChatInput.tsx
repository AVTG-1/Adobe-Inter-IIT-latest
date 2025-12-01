/**
 * AI Chat Input - Auralite Design
 *
 * Text input interface for AI chat
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AIChatInputProps {
  visible: boolean;
  onSend: (message: string) => void;
  onClose: () => void;
}

const AIChatInput: React.FC<AIChatInputProps> = ({
  visible,
  onSend,
  onClose,
}) => {
  const [message, setMessage] = useState('');

  if (!visible) return null;

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage('');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.inputContainer}>
        {/* Layers/Back Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="layers" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Text Input */}
        <TextInput
          style={styles.input}
          placeholder="Type something"
          placeholderTextColor="#888888"
          value={message}
          onChangeText={setMessage}
          onSubmitEditing={handleSend}
          returnKeyType="send"
          multiline
          maxLength={500}
        />

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            !message.trim() && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          activeOpacity={0.7}
          disabled={!message.trim()}
        >
          <Ionicons
            name="send"
            size={20}
            color={message.trim() ? '#FFFFFF' : '#666666'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242428',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#323232',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: '#323232',
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A9EFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#323232',
  },
});

export default AIChatInput;
