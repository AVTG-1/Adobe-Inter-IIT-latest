# Global AI Button - Integration Guide

## Quick Integration Steps for EditorScreen.tsx

### 1. Import the Component
```typescript
import GlobalAIButton from '../components/GlobalAIButton';
```

### 2. Add Animated Bottom Position Ref (if not exists)
```typescript
// In your state declarations
const globalAIBottom = useRef(new Animated.Value(110)).current;
```

### 3. Animate with Panels (add to existing panel animation useEffect)
```typescript
useEffect(() => {
  const anyPanelOpen = editPanelOpen || adjustmentOpen || filtersOpen ||
                       relightOpen || poseOpen; // Add your panel states

  const toBottomAI = anyPanelOpen ? 240 : 110; // Move up when panels open

  Animated.spring(globalAIBottom, {
    toValue: toBottomAI,
    friction: 12,
    tension: 30,
    useNativeDriver: false,
  }).start();
}, [editPanelOpen, adjustmentOpen, filtersOpen, /* other panel states */]);
```

### 4. Add AI Processing State
```typescript
const [isAIProcessing, setIsAIProcessing] = useState(false);
```

### 5. Create Handler Functions
```typescript
const handleAIPrompt = async (prompt: string) => {
  console.log('🤖 AI Prompt:', prompt);
  setIsAIProcessing(true);

  try {
    // Your AI processing logic here
    // Example: Call WebSocket or API
    const payload = {
      action: 'ai_edit',
      prompt: prompt,
      image_url: currentImageUrl,
    };

    // sendWs(payload); // If using WebSocket
    // or await apiClient.aiEdit(payload); // If using REST API

    // Show success toast
    Toast.show({
      type: 'success',
      text1: 'AI Processing',
      text2: 'Your request is being processed...',
    });
  } catch (error) {
    console.error('AI Error:', error);
    Toast.show({
      type: 'error',
      text1: 'AI Error',
      text2: 'Failed to process request',
    });
  } finally {
    setIsAIProcessing(false);
  }
};

const handleAIStop = () => {
  console.log('🛑 AI Stopped');
  setIsAIProcessing(false);
  // Add logic to cancel ongoing AI operations
};
```

### 6. Add Component to JSX (before closing View)
```typescript
return (
  <View style={styles.container}>
    {/* Your existing UI components */}

    {/* ... other components ... */}

    {/* Global AI Button - Last component for proper z-index */}
    <GlobalAIButton
      bottom={globalAIBottom}
      onSendPrompt={handleAIPrompt}
      isProcessing={isAIProcessing}
      onStop={handleAIStop}
    />

    <Toast />
  </View>
);
```

### 7. Ensure Proper Z-Index Stacking
```typescript
// In your styles
container: {
  flex: 1,
  backgroundColor: '#000000',
  position: 'relative', // Important for z-index
},
```

---

## Component Props Reference

| Prop | Type | Description |
|------|------|-------------|
| `bottom` | `Animated.Value` | Animated bottom position (adjusts with panels) |
| `onSendPrompt` | `(prompt: string) => void` | Callback when user sends a prompt |
| `isProcessing` | `boolean` | Shows stop button instead of send |
| `onStop` | `() => void` | Optional callback to stop AI processing |

---

## Features Included

✅ **Gemini-style inline expansion** (same row, smooth 260ms cubic easing)
✅ **50x50px circular AI button** with sparkle icon
✅ **Bounce animation** on tap
✅ **TextInput + Send/Stop/Close buttons** with opacity animation
✅ **Auto-focus** on expand
✅ **Keyboard handling** (dismisses on collapse)
✅ **Dynamic bottom positioning** (adjusts with panels)
✅ **Dark theme styling** (#242428 background)
✅ **Disabled state** for send button when input is empty
✅ **Processing state** (shows stop button)

---

## Animation Timings

- **Expand**: 260ms cubic bezier easing
- **Collapse**: 260ms cubic bezier easing
- **Content fade in**: 200ms (60ms delay)
- **Content fade out**: 150ms
- **Bounce**: Spring animation (friction: 3, tension: 40)

---

## Position Reference

Default positions:
- **Bottom**: 110px (normal state)
- **Bottom (panels open)**: 240px (moves up)
- **Right**: 20px
- **Z-Index**: 20 (above most UI elements)
- **Width (collapsed)**: 50px (button only)
- **Width (expanded)**: 320px (full chat)

---

## Styling Customization

To customize colors, edit `GlobalAIButton.tsx`:

```typescript
// Button color
backgroundColor: '#00D9FF', // Line 159

// Container background
backgroundColor: '#242428', // Line 138

// Send button color
color={aiPrompt.trim() ? '#00D9FF' : '#555555'} // Line 197

// Stop button color
color="#FF453A" // Line 187
```

---

## Example: Complete EditorScreen Integration

```typescript
export default function EditorScreen({ route, navigation }: Props) {
  // ... existing state ...

  // Add these
  const globalAIBottom = useRef(new Animated.Value(110)).current;
  const [isAIProcessing, setIsAIProcessing] = useState(false);

  // Animate with panels
  useEffect(() => {
    const anyPanelOpen = editPanelOpen || adjustmentOpen || filtersOpen;
    const toBottomAI = anyPanelOpen ? 240 : 110;

    Animated.spring(globalAIBottom, {
      toValue: toBottomAI,
      friction: 12,
      tension: 30,
      useNativeDriver: false,
    }).start();
  }, [editPanelOpen, adjustmentOpen, filtersOpen]);

  // Handlers
  const handleAIPrompt = async (prompt: string) => {
    console.log('🤖 AI:', prompt);
    setIsAIProcessing(true);

    // Your AI logic here

    setTimeout(() => setIsAIProcessing(false), 3000); // Mock
  };

  const handleAIStop = () => {
    setIsAIProcessing(false);
  };

  return (
    <View style={styles.container}>
      {/* ... existing UI ... */}

      {/* Global AI Button */}
      <GlobalAIButton
        bottom={globalAIBottom}
        onSendPrompt={handleAIPrompt}
        isProcessing={isAIProcessing}
        onStop={handleAIStop}
      />

      <Toast />
    </View>
  );
}
```

---

## Testing Checklist

- [ ] Button appears at bottom right
- [ ] Bounce animation works on tap
- [ ] Expands smoothly to the right (260ms)
- [ ] TextInput appears with opacity animation
- [ ] Auto-focuses on expand
- [ ] Send button disabled when empty
- [ ] Send button enabled with text
- [ ] Close button collapses chat
- [ ] Keyboard dismisses on collapse
- [ ] Processing state shows stop button
- [ ] Button moves up when panels open
- [ ] Button moves down when panels close

---

## Troubleshooting

**Issue**: Button not visible
**Fix**: Check z-index stacking, ensure it's the last component in JSX

**Issue**: Animation stutters
**Fix**: Ensure `useNativeDriver: false` for width animations

**Issue**: Keyboard covers input
**Fix**: Use `KeyboardAvoidingView` or adjust bottom position

**Issue**: Button doesn't move with panels
**Fix**: Verify animated bottom value is connected to panel state

---

## Advanced: Custom Positioning

To change base position:

```typescript
// In GlobalAIButton component
const globalAIBottom = useRef(new Animated.Value(150)).current; // Change 110 to 150

// Adjust panel offset
const toBottomAI = anyPanelOpen ? 270 : 150; // Increase both values equally
```
