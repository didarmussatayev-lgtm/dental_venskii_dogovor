# 🔧 Fix: Create Web Application OAuth Credentials

## The Problem
The current OAuth Client ID is configured as "NATIVE_DESKTOP" type, but we need "Web Application" type for browser usage.

## Solution: Create New Web Application Credentials

### Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Select project: **pro-med-bot**

### Step 2: Create Web Application OAuth Client
1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. **Application type**: Select **Web application**
4. **Name**: "Dogovor Website" (or any name you prefer)

### Step 3: Configure Authorized Origins & Redirect URIs
**Authorized JavaScript origins:**
- `http://localhost:8080`
- `http://localhost:3000`
- `http://127.0.0.1:8080`

**Authorized redirect URIs:**
- `http://localhost:8080`
- `http://localhost:3000`
- (Add your Railway domain when deployed)

### Step 4: Get the New Client ID
1. Click **CREATE**
2. **Copy the Client ID** (looks like: `xxxxx-xxxxxxx.apps.googleusercontent.com`)
3. You can ignore the Client Secret (not needed for client-side apps)

### Step 5: Update script.js
Replace the `GOOGLE_CLIENT_ID` in script.js with your new Web Application Client ID:

```javascript
const GOOGLE_CLIENT_ID = 'YOUR_NEW_WEB_CLIENT_ID_HERE.apps.googleusercontent.com';
```

### Step 6: Test Again
1. Save the file
2. Refresh the browser (Ctrl+R)
3. Click "Сохранить подпись"
4. Sign in with **promedkaraganda@gmail.com**
5. Grant permissions

---

## 📝 Important Notes:
- Keep the same API Key (already configured)
- Only the Client ID needs to be changed
- Make sure to select **Web application** type, not Desktop or Native
- When deploying to Railway, add your Railway domain to Authorized origins

## ✅ After Setup:
The Google sign-in popup will work correctly and you'll be able to upload signatures to Google Drive!
