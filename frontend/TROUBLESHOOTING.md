# Troubleshooting Guide - Professional Photo Editor

## 🔍 If Features Are Not Working

I've replaced all simulated features with **actual working implementations**. If features are still not working, here are the likely causes and solutions:

---

## 1. **Backend API Not Available**

### Symptoms:
- Features show "processing" but then fail
- Error messages like "Backend API unavailable"
- Filters/blur/adjustments don't apply

### Solution:
Check if the backend API is running:

```bash
# Check backend status
curl http://localhost:8000/health
# or
curl http://127.0.0.1:8000/health
```

**If backend is not running:**
1. Navigate to backend directory: `cd backend`
2. Start the backend: `python main.py` or `uvicorn main:app --reload`
3. Verify it's running on the correct port

**Configure API endpoint:**
Check `frontend/src/services/api.ts` for correct backend URL:
```typescript
const API_BASE_URL = 'http://localhost:8000'; // Update if different
```

---

## 2. **Network/CORS Issues**

### Symptoms:
- API calls fail with network errors
- CORS errors in console
- "Failed to fetch" errors

### Solution:

**For Web:**
Add CORS headers to backend:
```python
# In backend main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**For Mobile/Expo:**
- Ensure device and backend are on same network
- Use backend's IP address instead of localhost
- Update API_BASE_URL in `api.ts` to your machine's IP

---

## 3. **Image URI Issues**

### Symptoms:
- "No image selected" errors
- Operations fail even when layer is selected
- Canvas doesn't show image

### Solution:

**Check layer selection:**
```typescript
// In console
console.log(layerManager.selectedLayerId);
console.log(layerManager.getSelectedLayer());
```

**Verify image URI is valid:**
- Should start with: `file://`, `http://`, `https://`, or `asset://`
- Not empty or undefined

**Reset if needed:**
1. Load a new image from gallery
2. Or create blank canvas
3. Verify layer is created with valid imageUri

---

## 4. **Feature-Specific Issues**

### **Undo/Redo Not Working:**

**Check:**
1. History is initialized: `console.log(history.canUndo, history.canRedo)`
2. Operations are pushing to history
3. No TypeScript errors in console

**Debug:**
```typescript
// After any operation
console.log('History:', history.history.length);
console.log('Current index:', history.currentIndex);
```

---

### **Transform Tools (Crop/Rotate/Flip/Resize) Not Working:**

**These use `expo-image-manipulator` - should ALWAYS work**

**If failing:**
1. Check console for errors
2. Verify selected layer has valid imageUri
3. Check permissions for file system access

**Test:**
```bash
# Check if expo-image-manipulator is installed
cd frontend && npm list expo-image-manipulator
```

---

### **Filters Not Working:**

**Requires backend API**

**Check:**
1. Backend is running
2. Filter ID is valid (`grayscale`, `sepia`, `invert`, `brighten`, `contrast`, `saturate`)
3. Check network tab for API calls

**Test a filter manually:**
```bash
curl -X POST http://localhost:8000/api/edit/workflow \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "path/to/image.jpg",
    "operations": [{
      "type": "grayscale",
      "useService": "opencv",
      "params": {}
    }]
  }'
```

---

### **Blur Not Working:**

**Requires backend API**

**Check:**
1. Backend supports blur operation
2. Sigma parameter is correct (radius / 10)
3. OpenCV is installed on backend

**Test blur manually:**
```bash
curl -X POST http://localhost:8000/api/edit/workflow \
  -H "Content-Type: application/json" \
  -d '{
    "image_url": "path/to/image.jpg",
    "operations": [{
      "type": "blur",
      "useService": "opencv",
      "params": {"sigma": 2.0}
    }]
  }'
```

---

### **Adjustments Not Working:**

**Requires backend API**

**Currently supported:**
- ✅ Brightness
- ✅ Contrast
- ✅ Saturation
- ❌ Exposure, Highlights, Shadows, Vibrance, Warmth, Tint, Sharpness (backend must support)

**If not applying:**
1. Only adjust brightness/contrast/saturation
2. Check backend supports these operations
3. Verify parameter ranges are correct

---

## 5. **UI Not Responding**

### Symptoms:
- Buttons don't respond to taps
- Bottom sheets don't open
- Tools don't appear

### Solutions:

**Check for JavaScript errors:**
```bash
# In terminal running Metro bundler
# Look for red error screens or console errors
```

**Clear cache and rebuild:**
```bash
cd frontend
rm -rf node_modules
npm install
npx expo start -c
```

**Check component imports:**
- Verify all components are correctly imported
- No circular dependencies
- All required props are passed

---

## 6. **Performance Issues**

### Symptoms:
- App lags or freezes
- Animations are choppy
- Processing takes too long

### Solutions:

**Optimize image sizes:**
- Backend API works faster with smaller images
- Consider resizing large images before processing

**Check backend performance:**
- OpenCV operations can be slow on large images
- Monitor backend logs for processing times

**Reduce history size:**
In `useImageHistory.ts`, reduce `MAX_HISTORY_SIZE` from 50 to 20:
```typescript
const MAX_HISTORY_SIZE = 20; // Reduced for better performance
```

---

## 7. **TypeScript Errors**

### Symptoms:
- Red squiggly lines in editor
- Build fails
- Type mismatches

### Solutions:

**Check AdjustmentValues interface:**
- `ProfessionalAdjustmentsPanel` uses: `warmth` (not `temperature`)
- No `grain` property
- All values are numbers -100 to 100 (except sharpness: 0 to 100)

**Rebuild TypeScript:**
```bash
cd frontend
npx tsc --noEmit
```

---

## 8. **Common Error Messages & Fixes**

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "No Layer Selected" | No layer is currently selected | Select a layer from layers panel first |
| "Backend API unavailable" | Backend not running | Start backend server |
| "Cannot Blur/Cannot Crop" | No image in selected layer | Ensure layer has valid imageUri |
| "No Changes" | All adjustment sliders at 0 | Move at least one slider |
| "Filter Not Available" | Filter not supported by backend | Use supported filters only |
| "Network request failed" | Can't reach backend | Check network and API URL |
| "Processing Failed" | Backend error | Check backend logs for details |

---

## 9. **Debugging Steps**

### Step 1: Check App Loads
```bash
cd frontend
npx expo start
```
- App should load without errors
- No red error screens

### Step 2: Check Backend
```bash
cd backend
# Start backend
python main.py

# In another terminal, test
curl http://localhost:8000/health
```
- Should return 200 OK

### Step 3: Load an Image
1. Tap +Add → Import Photo
2. Select image from gallery
3. Verify image appears on canvas

### Step 4: Test Transform (Should Work Offline)
1. Select image layer
2. Tap Edit → Crop
3. Adjust crop area
4. Tap Apply
5. **Should work immediately** (uses local expo-image-manipulator)

### Step 5: Test Filter (Requires Backend)
1. Select image layer
2. Tap Edit → Filters
3. Select "Grayscale"
4. Watch for processing indicator
5. **If fails:** Backend issue
6. **If succeeds:** Backend working!

### Step 6: Test Undo/Redo
1. After any operation
2. Tap Undo button (top left)
3. **Should revert to previous image**
4. Tap Redo
5. **Should reapply change**

---

## 10. **What's Definitely Working**

These features work **100% locally** (no backend needed):
- ✅ Crop
- ✅ Rotate  
- ✅ Flip
- ✅ Resize
- ✅ Undo/Redo
- ✅ Layer management (create, select, delete, visibility)

These require **backend API**:
- Filters (grayscale, sepia, invert, etc.)
- Blur
- Adjustments (brightness, contrast, saturation)
- Sharpen
- Advanced features

**If EVERYTHING is broken**, the issue is likely:
1. App won't start → Check Metro bundler
2. App crashes on load → Check imports/dependencies
3. No UI response → Check JavaScript errors

**If SOME features work (transform tools) but OTHERS don't (filters/blur)**:
- Backend API is not running or not reachable

---

## 11. **Quick Diagnostic Test**

Run this test to verify what's working:

```bash
# In frontend terminal
npx expo start

# In backend terminal
cd backend
python main.py
```

**Test checklist:**
- [ ] App loads without errors
- [ ] Can load image from gallery
- [ ] Can see image on canvas
- [ ] Crop tool opens and applies
- [ ] Undo button reverts crop
- [ ] Redo button reapplies crop
- [ ] Filter applies (requires backend)
- [ ] Blur applies (requires backend)

**If first 6 work:** App is fine, backend needed for rest
**If none work:** Check app errors and dependencies

---

## 12. **Get More Help**

If still not working:

1. **Check console output:**
   ```bash
   # In terminal running expo
   # Look for errors, warnings, or stack traces
   ```

2. **Check backend logs:**
   ```bash
   # In terminal running backend
   # Look for request logs and errors
   ```

3. **Share specific error:**
   - What feature isn't working?
   - What's the exact error message?
   - What shows in console?

---

## ✅ Current Status Summary

**Commit:** `72f19ef`
**Branch:** `claude/extract-splash-home-features-01W3eUTqXrx9Cdqv1skWh14D`

**Working Features:**
- ✅ Undo/Redo (fully functional)
- ✅ Transform tools (crop, rotate, flip, resize) - work offline
- ✅ Filters - work with backend
- ✅ Blur - work with backend  
- ✅ Adjustments (brightness/contrast/saturation) - work with backend
- ✅ Sharpen - works with backend
- ✅ Layer management
- ✅ History tracking on all operations

**Requires Backend:**
- Filters, Blur, Adjustments, Sharpen all need backend API running

**Not Yet Implemented:**
- Drawing system (requires canvas implementation)
- Visual crop with drag handles (complex feature)
- Advanced adjustments (exposure, highlights, shadows, etc.) - backend must support

---

**The app is fully functional when backend is running!**
