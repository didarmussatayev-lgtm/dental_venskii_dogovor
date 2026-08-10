# 🚀 Railway Deployment Guide

## Prerequisites
- GitHub account with repository: https://github.com/maksattulegenov/dogovor_website
- Railway account (sign up at https://railway.app)

## Step 1: Push to GitHub

```bash
cd d:\workspace\dogovor_website

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Medical consent form website"

# Add remote
git remote add origin https://github.com/maksattulegenov/dogovor_website.git

# Push to GitHub
git push -u origin main
```

If you get an error about branch name, try:
```bash
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Railway

### Option A: Railway CLI (Recommended)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up
```

### Option B: Railway Dashboard (Easier)
1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose **maksattulegenov/dogovor_website**
5. Railway will auto-detect the `Procfile` and deploy
6. Wait for deployment to complete

## Step 3: Update Google Cloud Console

After deployment, you'll get a Railway URL like: `https://your-app.railway.app`

Update your Google Cloud Console:
1. Go to https://console.cloud.google.com/apis/credentials
2. Select your OAuth 2.0 Client ID
3. Add to **Authorized JavaScript origins**:
   - `https://your-app.railway.app`
4. Add to **Authorized redirect URIs**:
   - `https://your-app.railway.app`
5. Click **Save**

## Step 4: Test Your Live Website

1. Visit your Railway URL
2. Fill in the form (ФИО, телефон, ИИН, аллергия, подпись)
3. Check the consent checkbox and click «ЗАВЕРШИТЬ»
4. The backend generates the document and returns it as a PDF download

## 🎯 Your Deployed Website Will:
- ✅ Work as a static website (GitHub Pages)
- ✅ Accept form submissions and generate PDF documents server-side
- ✅ Upload agreements (DOCX + PDF) to Google Drive automatically
- ✅ Return the PDF directly to the user for download

## Troubleshooting

### CORS Errors
If you see CORS errors, add your Railway domain to the Google Cloud Console as described above.

### Environment Variables
Railway automatically sets `PORT` environment variable. The `Procfile` uses it to start the Python server.

### Logs
View logs in Railway dashboard to debug any issues.

## 📝 Files for Railway Deployment
- `Procfile` - Tells Railway how to start the app
- `runtime.txt` - Specifies Python version
- `.gitignore` - Excludes sensitive/unnecessary files

## 🔄 Updating Your Deployment
After making changes:
```bash
git add .
git commit -m "Your update message"
git push
```

Railway will automatically redeploy! 🚀
