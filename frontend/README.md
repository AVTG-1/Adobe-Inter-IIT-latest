# AI Photo Editor - Frontend (React Native)

React Native frontend application for the Adobe AI Photo Editor, built with Expo.

## Phase 1: Splash & Home Experience ✅

This is the initial implementation featuring:
- **Splash Screen 1** with fade-in animation and Skip button
- **Splash Screen 2** with slide-up animation and Skip button
- **Home Screen** with menu, profile, import/camera cards, and recent projects grid
- Stack navigation with smooth fade transitions
- Placeholder API client for future backend integration

---

## Project Structure

```
frontend/
├── src/
│   ├── navigation/
│   │   └── AppNavigator.tsx         # Stack navigation setup
│   ├── screens/
│   │   ├── Splash1Screen.tsx        # First splash screen
│   │   ├── Splash2Screen.tsx        # Second splash screen
│   │   └── HomeScreen.tsx           # Main home screen
│   ├── services/
│   │   └── api.ts                   # API client with mock data
│   ├── types/
│   │   └── api.ts                   # TypeScript types for API
│   └── config/
│       └── index.ts                 # App configuration
├── App.tsx                          # Root component
├── package.json
└── README.md
```

---

## Features Implemented

### 🎨 Splash Screens

**Splash1:**
- Gradient background (purple to pink)
- Fade-in + scale animation
- Icon animation with background glow
- Skip button (top-right)
- Auto-navigate to Splash2 after 2 seconds
- Active dot indicator

**Splash2:**
- Gradient background (pink to orange)
- Fade-in + slide-up animation
- Different icon and messaging
- Skip button (top-right)
- Auto-navigate to Home after 2 seconds
- Active dot indicator

**Skip Functionality:**
- Pressing Skip on either splash goes directly to Home
- Both splash screens are skipped

### 🏠 Home Screen

**Header:**
- Menu icon (left)
- App title (center)
- Profile icon (right)

**Main Actions:**
- **Import from Gallery** card (purple gradient)
  - Icon, title, subtitle
  - Tap handler (placeholder)
- **Open Camera** card (red gradient)
  - Icon, title, subtitle
  - Tap handler (placeholder)

**Recent Projects:**
- Grid layout (2 columns)
- 6 mock projects with thumbnails
- "See All" button
- Tap handlers for each project (placeholder)

**Animations:**
- Fade-in on mount
- Slide-up for action cards
- Smooth transitions

---

## Navigation Flow

```
App Launch
    ↓
Splash1 (2s auto-transition or Skip)
    ↓
Splash2 (2s auto-transition or Skip)
    ↓
Home
```

**Navigation Type:** Stack Navigator with fade transitions

---

## API Integration (Placeholder)

### API Client (`src/services/api.ts`)

Connected to FastAPI backend at `http://localhost:8000/api/v1`

**Available Methods:**

```typescript
// Health check
apiClient.checkHealth(): Promise<HealthResponse>

// Submit edit workflow
apiClient.submitEditWorkflow(request: EditRequest): Promise<WorkflowResponse>

// Get job status (future)
apiClient.getJobStatus(jobId: string): Promise<WorkflowResponse>
```

**Mock Mode (Phase 1):**
- Currently using mock data (`USE_MOCK_DATA: true` in config)
- Returns simulated responses after delays
- Can be switched to real API by setting `API_CONFIG.USE_MOCK_DATA = false`

### API Types (`src/types/api.ts`)

```typescript
interface EditRequest {
  image_url: string;
  operations: EditOperation[];
}

interface WorkflowResponse {
  job_id: string;
  status: JobStatus;
  result_url?: string;
  agent_thoughts: string[];
  processing_time_ms?: number;
  error?: string;
}
```

**Supported Operations:**
- `brightness`, `contrast`, `saturation`, `exposure`
- `crop`, `resize`, `rotate`
- `blur`

---

## Setup & Installation

### Prerequisites

- Node.js 16+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) or Android Emulator

### Install Dependencies

```bash
cd frontend
npm install
```

### Run the App

**Web:**
```bash
npm run web
```

**iOS:**
```bash
npm run ios
```

**Android:**
```bash
npm run android
```

**Expo Go (scan QR code):**
```bash
npx expo start
```

---

## Configuration

Edit `src/config/index.ts`:

```typescript
export const API_CONFIG = {
  BASE_URL: 'http://localhost:8000/api/v1',  // Backend URL
  USE_MOCK_DATA: true,                        // Toggle mock/real API
  TIMEOUT: 30000,
};

export const APP_CONFIG = {
  SPLASH_DURATION: 2000,  // Splash screen timing
};
```

---

## Tech Stack

| Package | Version | Purpose |
|---------|---------|---------|
| **React Native** | - | Mobile framework |
| **Expo** | ~52.0.11 | Development platform |
| **TypeScript** | ~5.3.3 | Type safety |
| **React Navigation** | ^6.x | Navigation |
| **Axios** | ^1.7.9 | HTTP client |
| **Expo Linear Gradient** | ^13.0.2 | Gradient backgrounds |
| **Expo Vector Icons** | ^14.0.4 | Icon library |

---

## Development Notes

### Current Status: Phase 1 Complete ✅

**What Works:**
- ✅ Splash screen animations and auto-transitions
- ✅ Skip button functionality
- ✅ Home screen UI with all components
- ✅ Navigation structure
- ✅ API client placeholder with mock data
- ✅ TypeScript types for backend integration

**Not Yet Implemented (Future Phases):**
- ❌ Gallery picker integration
- ❌ Camera integration
- ❌ Image editor screen
- ❌ Real API calls to backend
- ❌ Project persistence
- ❌ Menu drawer
- ❌ Profile screen

### TODO Markers

Search for `// TODO:` comments in code for future implementation points:
- `HomeScreen.tsx`: Gallery, camera, menu, profile handlers
- `api.ts`: Switch from mock to real API

---

## Connecting to Backend

The backend is a FastAPI service (Python) located in `../app/`.

**Backend Endpoints:**
- `GET /api/v1/health` - Health check
- `POST /api/v1/edit/general` - Image editing workflow

**To connect:**

1. **Start backend:**
   ```bash
   cd ..
   ./run.sh
   ```
   Backend runs on `http://localhost:8000`

2. **Switch to real API in frontend:**
   ```typescript
   // src/config/index.ts
   USE_MOCK_DATA: false
   ```

3. **Test connection:**
   ```typescript
   import { apiClient } from './src/services/api';

   const health = await apiClient.checkHealth();
   console.log(health); // { status: "healthy", version: "0.1.0", ... }
   ```

---

## Animations

All animations use `Animated` API from React Native:

**Splash Screens:**
- Fade-in opacity (0 → 1)
- Scale transform (0.8 → 1) for Splash1
- Slide-up translateY (50 → 0) for Splash2
- Skip button fade-in with delay

**Home Screen:**
- Fade-in on mount
- Slide-up for action cards
- Spring physics for smooth motion

**Navigation:**
- Fade transitions between screens
- Controlled via Stack Navigator options

---

## File Descriptions

| File | Purpose |
|------|---------|
| `App.tsx` | Root component, renders AppNavigator |
| `AppNavigator.tsx` | Stack navigation setup (Splash1 → Splash2 → Home) |
| `Splash1Screen.tsx` | First splash with gradient and animation |
| `Splash2Screen.tsx` | Second splash with different theme |
| `HomeScreen.tsx` | Main screen with actions and recent grid |
| `api.ts` | HTTP client for backend communication |
| `api.ts` (types) | TypeScript interfaces for API |
| `config/index.ts` | App configuration and feature flags |

---

## Testing

**Manual Testing Checklist:**

- [ ] App launches to Splash1
- [ ] Splash1 animates and auto-transitions after 2s
- [ ] Splash2 animates and auto-transitions after 2s
- [ ] Skip button on Splash1 goes to Home
- [ ] Skip button on Splash2 goes to Home
- [ ] Home screen displays header, cards, and grid
- [ ] Tapping cards logs to console
- [ ] Tapping recent projects logs to console
- [ ] Navigation animations are smooth

**Run Tests:**
```bash
npm test
```
(Test suite not yet implemented - placeholder)

---

## Future Phases

### Phase 2: Image Selection & Editor
- Gallery picker (expo-image-picker)
- Camera integration (expo-camera)
- Navigate to editor screen with selected image

### Phase 3: Editor Interface
- Image display with zoom/pan
- Tool panel with edit operations
- Apply operations UI
- Real-time preview

### Phase 4: Backend Integration
- Switch to real API calls
- Handle async job processing
- Display agent thoughts
- Error handling and retry logic

### Phase 5: Polish & Features
- Project persistence (AsyncStorage/SQLite)
- Menu drawer
- Profile screen
- Settings
- Analytics

---

## Troubleshooting

**Issue: "Cannot find module" errors**
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npx expo start --clear
```

**Issue: Navigation not working**
- Ensure all screens are imported correctly in AppNavigator.tsx
- Check navigation prop types match RootStackParamList

**Issue: Animations laggy**
- Use `useNativeDriver: true` for better performance
- Avoid animating layout properties (use transform instead)

**Issue: Backend connection fails**
- Verify backend is running: `curl http://localhost:8000/api/v1/health`
- Check network permissions on device
- Use ngrok for testing on physical device

---

## License

Part of Adobe-Frontend-Inter-IIT project.

---

## Contact & Support

For issues or questions about the frontend implementation, check:
- Navigation issues → `src/navigation/`
- Screen issues → `src/screens/`
- API issues → `src/services/api.ts`
- Type errors → `src/types/`

Happy coding! 🚀
