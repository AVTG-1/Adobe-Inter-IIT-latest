# ⚠️ Node.js Upgrade Required

## Before Running the App

You **MUST** upgrade to Node.js v20+ to avoid the `URL.canParse is not a function` error.

### Quick Upgrade (Using Conda)

Since you're using a conda environment `(adobe)`:

```bash
# Upgrade Node.js in your conda environment
conda install -c conda-forge nodejs=20

# Verify
node --version  # Should show v20.x.x
```

### Then Install Dependencies

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npx expo start -c
```

### For Complete Instructions

See `TROUBLESHOOTING.md` for detailed upgrade instructions using NVM or direct installation.

---

**Status**: ✅ Package dependencies updated
**Required**: Node.js >= 20.0.0
**Current packages**: Compatible with Expo SDK 54
