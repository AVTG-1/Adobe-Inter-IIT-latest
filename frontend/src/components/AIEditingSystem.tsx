import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import editingActionsData from '../data/editingActions.json';

interface ExecutedStep {
  id: string;
  actionId: string;
  name: string;
  description: string;
  icon: string;
  params: any;
  timestamp: number;
}

interface AIEditingSystemProps {
  onExecuteStep: (action: string, params: any) => Promise<void>;
  isProcessing: boolean;
}

const AIEditingSystem: React.FC<AIEditingSystemProps> = ({
  onExecuteStep,
  isProcessing,
}) => {
  const [prompt, setPrompt] = useState('');
  const [executedSteps, setExecutedSteps] = useState<ExecutedStep[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [selectedStep, setSelectedStep] = useState<ExecutedStep | null>(null);
  const [showStepDetail, setShowStepDetail] = useState(false);

  // Animation values for step icons
  const stepAnimations = useRef<{ [key: string]: Animated.Value }>({});

  // Generate predefined sequence from JSON
  const generateEditingSequence = (userPrompt: string) => {
    // For now, always return default sequence
    // Later: parse prompt and pick appropriate sequence
    return editingActionsData.predefinedSequences.default;
  };

  // Execute editing sequence step-by-step
  const executeSequence = async () => {
    if (!prompt.trim() || isExecuting) return;

    setIsExecuting(true);
    const sequence = generateEditingSequence(prompt);

    for (let i = 0; i < sequence.length; i++) {
      const step = sequence[i];
      const actionDef = editingActionsData.actions.find(
        (a) => a.id === step.action
      );

      if (!actionDef) continue;

      // Create step record
      const executedStep: ExecutedStep = {
        id: `step-${Date.now()}-${i}`,
        actionId: step.action,
        name: actionDef.name,
        description: actionDef.description,
        icon: actionDef.icon,
        params: step.params,
        timestamp: Date.now(),
      };

      // Add step to timeline with animation
      setExecutedSteps((prev) => [...prev, executedStep]);
      animateStepAppearance(executedStep.id);

      // Execute the actual editing action
      try {
        await onExecuteStep(step.action, step.params);
        // Wait a bit to show the transformation
        await new Promise((resolve) => setTimeout(resolve, 800));
      } catch (error) {
        console.error(`Failed to execute step ${step.action}:`, error);
      }
    }

    setIsExecuting(false);
    setPrompt('');
  };

  // Animate step icon appearance
  const animateStepAppearance = (stepId: string) => {
    const anim = new Animated.Value(0);
    stepAnimations.current[stepId] = anim;

    Animated.spring(anim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // Open step detail panel
  const handleStepTap = (step: ExecutedStep) => {
    setSelectedStep(step);
    setShowStepDetail(true);
  };

  // Clear all steps
  const clearSteps = () => {
    setExecutedSteps([]);
    stepAnimations.current = {};
  };

  return (
    <>
      {/* Vertical Step Timeline - Left Side */}
      {executedSteps.length > 0 && (
        <View style={styles.stepTimelineContainer}>
          <ScrollView
            style={styles.stepTimeline}
            showsVerticalScrollIndicator={false}
          >
            {executedSteps.map((step, index) => {
              const anim = stepAnimations.current[step.id] || new Animated.Value(1);

              return (
                <Animated.View
                  key={step.id}
                  style={[
                    styles.stepIcon,
                    {
                      opacity: anim,
                      transform: [
                        {
                          scale: anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.3, 1],
                          }),
                        },
                        {
                          translateX: anim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-50, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={styles.stepIconButton}
                    onPress={() => handleStepTap(step)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={step.icon as any} size={20} color="#FFFFFF" />
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{index + 1}</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </ScrollView>

          {/* Clear Steps Button */}
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearSteps}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      )}

      {/* Step Detail Modal */}
      <Modal
        visible={showStepDetail}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStepDetail(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStepDetail(false)}
        >
          <View style={styles.stepDetailPanel}>
            {selectedStep && (
              <>
                <View style={styles.stepDetailHeader}>
                  <Ionicons
                    name={selectedStep.icon as any}
                    size={32}
                    color="#4A9EFF"
                  />
                  <Text style={styles.stepDetailTitle}>{selectedStep.name}</Text>
                </View>

                <Text style={styles.stepDetailDescription}>
                  {selectedStep.description}
                </Text>

                <View style={styles.stepDetailParams}>
                  <Text style={styles.stepDetailParamsTitle}>Parameters:</Text>
                  {Object.entries(selectedStep.params).map(([key, value]) => (
                    <View key={key} style={styles.paramRow}>
                      <Text style={styles.paramKey}>{key}:</Text>
                      <Text style={styles.paramValue}>{String(value)}</Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.closeDetailButton}
                  onPress={() => setShowStepDetail(false)}
                >
                  <Text style={styles.closeDetailText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  stepTimelineContainer: {
    position: 'absolute',
    left: 13,
    bottom: 180,
    zIndex: 10,
  },
  stepTimeline: {
    maxHeight: 300,
  },
  stepIcon: {
    marginBottom: 12,
  },
  stepIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#242428',
    borderWidth: 2,
    borderColor: '#4A9EFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A9EFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  stepNumber: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4A9EFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  clearButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#242428',
    borderWidth: 2,
    borderColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDetailPanel: {
    width: '85%',
    backgroundColor: '#242428',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#4A9EFF',
  },
  stepDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepDetailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  stepDetailDescription: {
    fontSize: 14,
    color: '#CCCCCC',
    marginBottom: 20,
    lineHeight: 20,
  },
  stepDetailParams: {
    backgroundColor: '#1A1A1D',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  stepDetailParamsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4A9EFF',
    marginBottom: 12,
  },
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paramKey: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  paramValue: {
    fontSize: 14,
    color: '#4A9EFF',
    fontWeight: 'bold',
  },
  closeDetailButton: {
    backgroundColor: '#4A9EFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeDetailText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default AIEditingSystem;
