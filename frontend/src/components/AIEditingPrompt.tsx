import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react';
import { Ionicons } from '@expo/vector-icons';

interface AIEditingPromptProps {
  onSubmit: (prompt: string) => void;
  isExecuting: boolean;
  onClose: () => void;
}

const AIEditingPrompt: React.FC<AIEditingPromptProps> = ({
  onSubmit,
  isExecuting,
  onClose,
}) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    if (!prompt.trim() || isExecuting) return;
    onSubmit(prompt);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="sparkles" size={24} color="#4A9EFF" />
          <Text style={styles.title}>AI Image Editor</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        Describe how you want to edit your image
      </Text>

      <View style={styles.promptContainer}>
        <TextInput
          style={styles.promptInput}
          placeholder="e.g., Make it brighter and more vibrant..."
          placeholderTextColor="#666666"
          value={prompt}
          onChangeText={setPrompt}
          multiline
          maxLength={200}
          editable={!isExecuting}
        />
        <Text style={styles.charCount}>{prompt.length}/200</Text>
      </View>

      <View style={styles.examples}>
        <Text style={styles.examplesTitle}>Quick Examples:</Text>
        <View style={styles.exampleChips}>
          <TouchableOpacity
            style={styles.exampleChip}
            onPress={() => setPrompt('Make it brighter and more colorful')}
            disabled={isExecuting}
          >
            <Text style={styles.exampleText}>✨ Enhance</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exampleChip}
            onPress={() => setPrompt('Apply artistic filter and boost colors')}
            disabled={isExecuting}
          >
            <Text style={styles.exampleText}>🎨 Artistic</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exampleChip}
            onPress={() => setPrompt('Make it professional looking')}
            disabled={isExecuting}
          >
            <Text style={styles.exampleText}>💼 Professional</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.submitButton,
          (!prompt.trim() || isExecuting) && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!prompt.trim() || isExecuting}
        activeOpacity={0.8}
      >
        {isExecuting ? (
          <View style={styles.executingContainer}>
            <Animated.View style={styles.loadingDots}>
              <Text style={styles.submitText}>Processing</Text>
              <Text style={styles.dots}>...</Text>
            </Animated.View>
          </View>
        ) : (
          <>
            <Ionicons name="flash" size={20} color="#FFFFFF" />
            <Text style={styles.submitText}>Generate Edit</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        AI will apply a sequence of edits based on your prompt
      </Text>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1D',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#242428',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 20,
  },
  promptContainer: {
    backgroundColor: '#242428',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4A9EFF',
    padding: 16,
    marginBottom: 20,
  },
  promptInput: {
    fontSize: 16,
    color: '#FFFFFF',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'right',
    marginTop: 8,
  },
  examples: {
    marginBottom: 20,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  exampleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  exampleChip: {
    backgroundColor: '#242428',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4A9EFF',
  },
  exampleText: {
    fontSize: 13,
    color: '#4A9EFF',
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A9EFF',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#333333',
    opacity: 0.5,
  },
  executingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dots: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  submitText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  disclaimer: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default AIEditingPrompt;
