# 🔧 Google Cloud Setup Guide

## Required: Get Google API Key

To use this website without a backend server, you need to create an API key in Google Cloud Console.

## Steps:

### 1️⃣ Go to Google Cloud Console
Visit: https://console.cloud.google.com/

### 2️⃣ Select Your Project
Select the project: **pro-med-bot**

### 3️⃣ Enable Google Drive API
- Go to **APIs & Services** > **Library**
- Search for "Google Drive API"
- Click **Enable** (if not already enabled)

### 4️⃣ Create API Key
- Go to **APIs & Services** > **Credentials**
- Click **+ CREATE CREDENTIALS**
- Select **API Key**
- Copy the API key

### 5️⃣ Restrict the API Key (Important!)
- Click on the newly created API key
- Under **API restrictions**, select **Restrict key**
- Choose **Google Drive API**
- Under **Website restrictions**, add:
  - `http://localhost:3000`
  - Your Railway domain (when deployed)
- Click **Save**

### 6️⃣ Update script.js
Open `script.js` and replace the placeholder API key:

```javascript
const GOOGLE_API_KEY = 'YOUR_ACTUAL_API_KEY_HERE';
```

## ✅ Testing

1. Open `index.html` directly in your browser (no server needed!)
2. Fill in the form
3. Click **"Сохранить подпись"**
4. You'll be prompted to sign in with Google (use promedkaraganda@gmail.com)
5. Grant permissions
6. Signature will be uploaded to Google Drive!

## 🚀 Deploy to Railway

When you deploy to Railway:
1. Add your Railway domain to the API key restrictions
2. Update the OAuth redirect URIs in Google Cloud Console
3. No backend server needed - it's all client-side!

## 📝 Note
- This setup works entirely in the browser
- No Node.js server required for testing
- Can be hosted as static files on Railway, Netlify, Vercel, etc.
