# Troubleshooting Guide

## 🔴 Error: `URL.canParse is not a function`

### Problem
```
TypeError: URL.canParse is not a function
    at parseBundleOptionsFromBundleRequestUrl
```

### Root Cause
Your **Node.js version is too old**. The `URL.canParse()` method requires **Node.js 18.17.0+** or **Node.js 20+**.

### Solution

#### 1. Check Your Current Node.js Version
```bash
node --version
```

If it shows anything **below v18.17.0**, you need to upgrade.

---

## 🚀 How to Upgrade Node.js

### Option 1: Using NVM (Recommended)

**NVM** (Node Version Manager) allows you to install and switch between multiple Node.js versions.

#### Install NVM
```bash
# Download and install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload your shell configuration
source ~/.bashrc  # or source ~/.zshrc for zsh
```

#### Install Node.js 20 (LTS)
```bash
# Install Node.js 20 (latest LTS)
nvm install 20

# Set Node.js 20 as default
nvm use 20

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

#### Switch Between Versions
```bash
# List installed versions
nvm list

# Use a specific version
nvm use 20

# Set default version
nvm alias default 20
```

---

### Option 2: Using Conda (If you're using Conda)

Since I see you're in a conda environment (`(adobe)`), you can install Node.js via conda:

```bash
# Install Node.js 20 in your conda environment
conda install -c conda-forge nodejs=20

# Verify installation
node --version
npm --version
```

---

### Option 3: Direct Installation

#### For Ubuntu/Debian:
```bash
# Remove old Node.js
sudo apt remove nodejs npm

# Add NodeSource repository for Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js 20
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

#### For macOS:
```bash
# Using Homebrew
brew install node@20

# Or download from nodejs.org
# Visit: https://nodejs.org/en/download/
```

---

## 🔧 After Upgrading Node.js

### 1. Clean Everything
```bash
cd frontend

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Clear npm cache
npm cache clean --force

# Clear Expo cache
rm -rf .expo
```

### 2. Reinstall Dependencies
```bash
# Install with updated package versions
npm install

# Verify no errors
```

### 3. Start Expo
```bash
# Start with cache clear
npx expo start -c

# Or for web specifically
npx expo start --web -c
```

---

## 📦 Package Version Warnings

If you see warnings like:
```
The following packages should be updated for best compatibility...
```

This has been fixed in the updated `package.json`. After running `npm install`, these warnings should disappear.

### Updated Package Versions:
- ✅ `@react-native-async-storage/async-storage`: **2.2.0** (was 1.24.0)
- ✅ `@react-native-community/slider`: **5.0.1** (was 5.1.1)
- ✅ `react-native-gesture-handler`: **~2.28.0** (was 2.29.1)
- ✅ `react-native-screens`: **~4.16.0** (was 4.18.0)

---

## 🔍 Verify Everything is Working

### 1. Check Node.js Version
```bash
node --version
# Should output: v20.x.x or v18.17.0+
```

### 2. Check Package Versions
```bash
npm list --depth=0
# Should show updated versions without warnings
```

### 3. Start Expo
```bash
cd frontend
npx expo start -c
```

### 4. Open Web
Press `w` in the Expo terminal, or visit: http://localhost:8081

---

## ✅ Expected Output (Success)

When everything is working correctly, you should see:
```
Starting Metro Bundler
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ QR CODE HERE           █
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

› Metro waiting on exp://...
› Web is waiting on http://localhost:8081

› Press w │ open web
```

**No errors!** ✅

---

## 🆘 Still Having Issues?

### Issue: Metro bundler crashes immediately
**Solution:**
```bash
# Clear all caches
rm -rf node_modules .expo package-lock.json
npm cache clean --force
npm install
npx expo start --clear
```

### Issue: `Cannot find module 'metro'`
**Solution:**
```bash
npm install metro metro-config --save-dev
```

### Issue: Port 8081 already in use
**Solution:**
```bash
# Kill process on port 8081
lsof -ti:8081 | xargs kill -9

# Or use a different port
npx expo start --port 8082
```

### Issue: Firebase errors
**Solution:**
Firebase is optional for now. The app will show a warning but still work.
```
Firebase is not properly configured. Please set up Firebase to enable cloud storage features.
```
This is expected and won't prevent the app from running.

---

## 📋 Complete Fresh Start Checklist

If nothing else works, do a complete fresh start:

```bash
# 1. Upgrade Node.js to v20+ (see above)
node --version  # Verify >= v20.0.0

# 2. Navigate to frontend directory
cd frontend

# 3. Remove everything
rm -rf node_modules package-lock.json .expo

# 4. Clear npm cache
npm cache clean --force

# 5. Install dependencies
npm install

# 6. Start Expo
npx expo start -c

# 7. Press 'w' to open web
```

---

## 🎯 Quick Reference

| Error | Solution |
|-------|----------|
| `URL.canParse is not a function` | Upgrade Node.js to v20+ |
| `Package version warnings` | Run `npm install` (package.json updated) |
| `MIME type 'text/html' error` | Clear cache: `npx expo start -c` |
| `Metro bundler fails` | Delete node_modules, reinstall |
| `Port 8081 in use` | Kill process: `lsof -ti:8081 \| xargs kill -9` |

---

## 🌟 Recommended Setup

For the best development experience:

- **Node.js:** v20.x (LTS)
- **npm:** v10.x
- **Expo CLI:** Latest (via npx)
- **Package Manager:** npm (not yarn for this project)

---

**Need more help?** Check the main [README.md](./README.md) for setup instructions.
