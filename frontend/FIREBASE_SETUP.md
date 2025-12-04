# Firebase/Google Cloud Storage Setup Guide

Complete guide to set up Firebase and Google Cloud Storage for the AI Photo Editor app.

---

## 🎯 Overview

This app uses **Firebase Storage** (which is built on Google Cloud Storage) to store and serve images. You'll need to:

1. Create a Firebase project
2. Set up Firebase Storage
3. Configure Firebase in your React Native app
4. Update security rules

**Time Required:** ~15 minutes

---

## 📋 Prerequisites

- Google account
- Node.js and npm installed
- Expo CLI installed
- React Native development environment set up

---

## Step 1: Create Firebase Project

### 1.1 Go to Firebase Console

Visit: https://console.firebase.google.com/

### 1.2 Create New Project

1. Click **"Add project"** or **"Create a project"**
2. Enter project name: `ai-photo-editor` (or your preferred name)
3. Click **Continue**
4. **Google Analytics:** Enable or disable (optional for this app)
5. Click **Create project**
6. Wait for project to be created (~30 seconds)
7. Click **Continue**

---

## Step 2: Add Apps to Firebase

### 2.1 Add Android App

1. In Firebase Console, click the **Android icon** to add Android app
2. Fill in the form:
   - **Android package name:** Get this from `app.json`:
     ```json
     {
       "expo": {
         "android": {
           "package": "com.yourcompany.aiphotoeditior"
         }
       }
     }
     ```
     If not set, use: `com.yourcompany.aiphotoeditior`

   - **App nickname (optional):** "AI Photo Editor Android"
   - **Debug signing certificate SHA-1 (optional):** Skip for now

3. Click **Register app**

4. **Download config file:**
   - Click **Download google-services.json**
   - Place it in: `android/app/google-services.json`
   - Create the `android/app/` directory if needed

5. Click **Next** through the remaining steps
6. Click **Continue to console**

### 2.2 Add iOS App

1. In Firebase Console, click the **iOS icon** to add iOS app
2. Fill in the form:
   - **iOS bundle ID:** Get this from `app.json`:
     ```json
     {
       "expo": {
         "ios": {
           "bundleIdentifier": "com.yourcompany.aiphotoeditior"
         }
       }
     }
     ```
     If not set, use: `com.yourcompany.aiphotoeditior`

   - **App nickname (optional):** "AI Photo Editor iOS"
   - **App Store ID (optional):** Skip for now

3. Click **Register app**

4. **Download config file:**
   - Click **Download GoogleService-Info.plist**
   - Place it in: `ios/GoogleService-Info.plist`
   - Create the `ios/` directory if needed

5. Click **Next** through the remaining steps
6. Click **Continue to console**

---

## Step 3: Enable Firebase Storage

### 3.1 Navigate to Storage

1. In Firebase Console sidebar, click **Build** → **Storage**
2. Click **Get Started**

### 3.2 Configure Security Rules

**Choose one of these options:**

**Option A: Development Mode (Easy, Less Secure)**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // Allow all reads and writes (development only!)
      allow read, write: if true;
    }
  }
}
```

**Option B: Authenticated Users (Recommended)**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // Allow reads by anyone
      allow read: if true;
      // Allow writes only by authenticated users
      allow write: if request.auth != null;
    }
  }
}
```

**Option C: Production Mode (Most Secure)**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{userId}/{fileName} {
      // Allow reads by anyone
      allow read: if true;
      // Allow writes only by owner
      allow write: if request.auth.uid == userId;
    }
    match /edited/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

3. Click **Next**

### 3.3 Select Storage Location

1. Choose a location close to your users:
   - `us-central1` (USA)
   - `europe-west1` (Belgium)
   - `asia-south1` (Mumbai)
   - etc.

2. Click **Done**

Your Firebase Storage is now set up! 🎉

---

## Step 4: Get Firebase Configuration

### 4.1 Find Your Config

1. In Firebase Console, click the **Gear icon** ⚙️ → **Project settings**
2. Scroll down to **"Your apps"** section
3. Click on your **Web app** (or add a web app if needed):
   - Click **Add app** → **Web** icon
   - Register app with nickname: "Web Config"
   - Copy the configuration

### 4.2 Copy Configuration Values

You'll see something like:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB...",
  authDomain: "ai-photo-editor-12345.firebaseapp.com",
  projectId: "ai-photo-editor-12345",
  storageBucket: "ai-photo-editor-12345.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

### 4.3 Update App Configuration

Open `frontend/src/config/index.ts` and replace the placeholders:

```typescript
export const STORAGE_CONFIG = {
  FIREBASE_CONFIG: {
    apiKey: 'AIzaSyB...',  // Your actual API key
    authDomain: 'ai-photo-editor-12345.firebaseapp.com',
    projectId: 'ai-photo-editor-12345',
    storageBucket: 'ai-photo-editor-12345.appspot.com',
    messagingSenderId: '123456789012',
    appId: '1:123456789012:web:abcdef123456',
  },
  BUCKET_NAME: 'ai-photo-editor-12345.appspot.com',  // Same as storageBucket
  // ... rest stays the same
};
```

---

## Step 5: Configure Expo App

### 5.1 Update app.json

Add the Firebase plugin configuration:

```json
{
  "expo": {
    "name": "AI Photo Editor",
    "slug": "ai-photo-editor",
    "android": {
      "package": "com.yourcompany.aiphotoeditior",
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.aiphotoeditior",
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/storage"
    ]
  }
}
```

### 5.2 Rebuild the App

For Expo managed workflow:
```bash
cd frontend
eas build --profile development --platform ios
eas build --profile development --platform android
```

For bare workflow (after `expo prebuild`):
```bash
# iOS
cd ios && pod install && cd ..
npx react-native run-ios

# Android
npx react-native run-android
```

---

## Step 6: Test the Integration

### 6.1 Test Upload

1. Run the app:
   ```bash
   cd frontend
   npm start
   ```

2. Navigate to Home screen
3. Tap **"Import from Gallery"**
4. Select an image
5. Watch the upload progress
6. Verify navigation to Editor screen

### 6.2 Verify in Firebase Console

1. Go to Firebase Console → Storage
2. Click on **Files** tab
3. You should see: `uploads/` folder with your uploaded image
4. Click on the image to see details
5. Copy the **download URL** - this is what gets passed to Editor

---

## 🔧 Troubleshooting

### Issue: "Default app not initialized"

**Solution:**
- Ensure `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) are in the correct locations
- Rebuild the app after adding config files
- Check that package names match in Firebase console and `app.json`

### Issue: "Storage bucket not found"

**Solution:**
- Verify `storageBucket` value in config is correct
- Make sure you clicked "Get Started" in Firebase Storage
- Check that bucket location was selected

### Issue: "Permission denied"

**Solution:**
- Check Storage Rules in Firebase Console
- Use development mode rules temporarily:
  ```
  allow read, write: if true;
  ```
- For production, implement authentication

### Issue: "Upload fails silently"

**Solution:**
- Check network connectivity
- Verify Firebase config values are correct
- Look at console logs for error messages
- Test with a smaller image (<1MB)

### Issue: "Image doesn't load in Editor"

**Solution:**
- Verify download URL is accessible (open in browser)
- Check storage rules allow public reads:
  ```
  allow read: if true;
  ```
- Look for CORS issues (rare with Firebase)

---

## 🔐 Security Best Practices

### 1. **Never Commit Credentials**

Add to `.gitignore`:
```
# Firebase
google-services.json
GoogleService-Info.plist
firebase-debug.log
.firebase/
```

### 2. **Use Environment Variables**

For sensitive config:
```bash
# .env
FIREBASE_API_KEY=AIzaSyB...
FIREBASE_PROJECT_ID=ai-photo-editor-12345
```

### 3. **Implement Authentication**

For production, add Firebase Auth:
```typescript
import auth from '@react-native-firebase/auth';

// Sign in user before upload
await auth().signInAnonymously();
```

### 4. **Validate File Types**

Already implemented in `storage.ts`:
```typescript
ALLOWED_FORMATS: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
```

### 5. **Limit File Sizes**

Already implemented:
```typescript
MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
```

### 6. **Monitor Usage**

Check Firebase Console → Usage tab:
- Storage used
- Downloads
- Uploads
- Network bandwidth

---

## 💰 Pricing & Quotas

### Free Tier (Spark Plan)

- **Storage:** 5 GB
- **Downloads:** 1 GB/day
- **Uploads:** 1 GB/day

### Paid Tier (Blaze Plan - Pay as you go)

- **Storage:** $0.026/GB/month
- **Downloads:** $0.12/GB
- **Uploads:** $0.12/GB

### Estimate for Testing

With 100 image uploads (5MB each):
- Storage: ~500MB
- Cost: ~$0.01/month

**You'll be well within the free tier for development!**

---

## 📱 Platform-Specific Notes

### Android

**Location of google-services.json:**
```
android/
  app/
    google-services.json  ← Place here
    build.gradle
```

**Verify in build.gradle:**
```gradle
apply plugin: 'com.google.gms.google-services'
```

### iOS

**Location of GoogleService-Info.plist:**
```
ios/
  YourApp/
    GoogleService-Info.plist  ← Place here
  Podfile
```

**Verify in Xcode:**
1. Open `.xcworkspace` in Xcode
2. File should appear in project navigator
3. Check Target Membership is checked

---

## 🚀 Next Steps

After Firebase is set up:

1. ✅ Test image upload from gallery
2. ✅ Test image capture from camera
3. ✅ Verify images appear in Firebase Console
4. ✅ Test Editor screen displays images
5. ✅ Test on both iOS and Android
6. ✅ Monitor Firebase Console for usage
7. ✅ Implement authentication (Phase 3+)
8. ✅ Set up production security rules

---

## 📚 Additional Resources

- [Firebase Docs](https://firebase.google.com/docs)
- [React Native Firebase Docs](https://rnfirebase.io/)
- [Firebase Storage Security Rules](https://firebase.google.com/docs/storage/security)
- [Expo + Firebase Guide](https://docs.expo.dev/guides/using-firebase/)

---

## 🆘 Getting Help

If you encounter issues:

1. Check console logs in the app
2. Check Firebase Console → Storage → Rules
3. Verify config values match exactly
4. Test with a simple image (JPEG, <1MB)
5. Search [Stack Overflow](https://stackoverflow.com/questions/tagged/firebase-storage)
6. Ask in [Firebase Discord](https://discord.gg/firebase)

---

**Setup Complete!** Your app is now ready to upload and display images from Google Cloud Storage! 🎉

---

**Last Updated:** November 15, 2025
