# 🌐 Frontend Deployment Guide

This guide covers deploying the Warranty Tracker frontend to various hosting platforms. The frontend is a static React application built with Vite.

## 📋 Prerequisites

1. **Built frontend**: Make sure you've built the frontend:

   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Your Contract ID**: Have your deployed contract ID ready (from backend deployment)

## 🚀 Deployment Options

### Option 1: Vercel (Recommended - Easiest)

**Why Vercel?**

- ✅ Free tier with generous limits
- ✅ Automatic deployments from Git
- ✅ Zero-config for React/Vite
- ✅ Custom domains
- ✅ HTTPS by default
- ✅ Excellent performance

#### Steps:

1. **Install Vercel CLI** (optional, you can also use the web UI):

   ```bash
   npm i -g vercel
   ```

2. **Deploy from command line**:

   ```bash
   cd frontend
   vercel
   ```

   Follow the prompts:

   - Link to existing project or create new
   - Project settings (use defaults)
   - Build settings:
     - Build Command: `npm run build`
     - Output Directory: `dist`

3. **Or deploy via GitHub** (recommended):

   - Push your code to GitHub
   - Go to [vercel.com](https://vercel.com)
   - Sign up/login with GitHub
   - Click "New Project"
   - Import your repository
   - Configure:
     - Framework Preset: Vite
     - Root Directory: `frontend`
     - Build Command: `npm run build` (or `pnpm build`)
     - Output Directory: `dist`
   - Click "Deploy"

4. **Update Vite config** (if needed):

   The current `vite.config.ts` should work fine, but if you want to ensure correct base paths, you can add:

   ```typescript
   export default defineConfig({
     plugins: [react()],
     base: "/", // Use './' if deploying to subdirectory
     build: {
       outDir: "dist",
     },
     server: {
       port: 3000,
       open: true,
     },
   });
   ```

5. **Your app will be live at**: `https://your-project-name.vercel.app`

---

### Option 2: Netlify

**Why Netlify?**

- ✅ Free tier
- ✅ Easy drag-and-drop deployment
- ✅ Automatic deployments from Git
- ✅ Custom domains
- ✅ HTTPS by default

#### Steps:

1. **Install Netlify CLI** (optional):

   ```bash
   npm i -g netlify-cli
   ```

2. **Build the frontend**:

   ```bash
   cd frontend
   npm run build
   ```

3. **Deploy via CLI**:

   ```bash
   netlify deploy --prod --dir=dist
   ```

   First time: Follow prompts to login and create site

4. **Or deploy via GitHub**:

   - Push your code to GitHub
   - Go to [app.netlify.com](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect GitHub and select your repository
   - Configure build settings:
     - Base directory: `frontend`
     - Build command: `npm run build` (or `pnpm build`)
     - Publish directory: `frontend/dist`
   - Click "Deploy site"

5. **Create `netlify.toml`** (optional, for better configuration):

   ```toml
   [build]
     command = "npm run build"
     publish = "dist"
     base = "frontend"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

6. **Your app will be live at**: `https://your-site-name.netlify.app`

---

### Option 3: GitHub Pages

**Why GitHub Pages?**

- ✅ Free
- ✅ Integrated with GitHub
- ✅ Good for open source projects

#### Steps:

1. **Update `vite.config.ts`**:

   ```typescript
   import { defineConfig } from "vite";
   import react from "@vitejs/plugin-react";

   export default defineConfig({
     plugins: [react()],
     base: "/warranty-tracker/", // Replace with your repo name
     build: {
       outDir: "dist",
     },
     server: {
       port: 3000,
       open: true,
     },
   });
   ```

2. **Install `gh-pages`**:

   ```bash
   cd frontend
   npm install --save-dev gh-pages
   ```

3. **Add deploy script to `package.json`**:

   ```json
   {
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```

4. **Deploy**:

   ```bash
   npm run deploy
   ```

5. **Enable GitHub Pages**:

   - Go to your GitHub repository
   - Settings → Pages
   - Source: `gh-pages` branch
   - Save

6. **Your app will be live at**: `https://your-username.github.io/warranty-tracker/`

---

### Option 4: Cloudflare Pages

**Why Cloudflare Pages?**

- ✅ Free tier
- ✅ Fast global CDN
- ✅ Unlimited bandwidth
- ✅ Automatic deployments from Git

#### Steps:

1. **Push your code to GitHub/GitLab**

2. **Go to Cloudflare Dashboard**:

   - Visit [dash.cloudflare.com](https://dash.cloudflare.com)
   - Go to "Pages" → "Create a project"

3. **Connect Git repository**:

   - Select your Git provider
   - Choose your repository
   - Configure:
     - Framework preset: Vite
     - Build command: `npm run build` (or `pnpm build`)
     - Build output directory: `frontend/dist`
     - Root directory: `frontend`

4. **Deploy**:

   - Click "Save and Deploy"

5. **Your app will be live at**: `https://your-project.pages.dev`

---

### Option 5: Surge.sh (Quick & Simple)

**Why Surge?**

- ✅ Very simple
- ✅ Quick deployment
- ✅ Free for basic use

#### Steps:

1. **Install Surge**:

   ```bash
   npm install -g surge
   ```

2. **Build and deploy**:

   ```bash
   cd frontend
   npm run build
   cd dist
   surge
   ```

   - First time: Create account and choose domain

3. **Your app will be live at**: `https://your-site.surge.sh`

---

## ⚙️ Environment Configuration

After deployment, you may want to:

1. **Set environment variables** (if you need different configs for different environments):

   Most platforms allow setting environment variables:

   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Build & Deploy → Environment
   - Cloudflare: Pages → Settings → Environment Variables

2. **Update contract configuration in the app**:

   Users will enter the contract ID in the app's UI, so no code changes needed. However, if you want to pre-configure it, you can:

   - Use environment variables in `vite.config.ts`
   - Or modify the default config in `src/utils/soroban.ts`

---

## 🔧 Troubleshooting

### Build fails

- Make sure all dependencies are in `package.json`
- Check that `node_modules` is not committed (should be in `.gitignore`)
- Verify build command is correct

### 404 errors on page refresh

- This happens with SPAs. Add a redirect rule:
  - **Vercel**: Automatically handles this
  - **Netlify**: Add `_redirects` file in `public/`:
    ```
    /*    /index.html   200
    ```
  - **Cloudflare Pages**: Automatically handles this
  - **GitHub Pages**: May need custom 404 handling

### CORS errors

- The RPC endpoints should allow cross-origin requests
- If you encounter CORS issues, check:
  - Your network configuration
  - RPC endpoint URLs are correct
  - No proxy settings blocking requests

### Contract connection issues

- Verify contract ID is correct
- Check network (testnet/mainnet) matches
- Ensure RPC URL is accessible: `https://soroban-testnet.stellar.org:443`

---

## 📝 Quick Reference

### Build locally

```bash
cd frontend
npm install
npm run build
# Output: frontend/dist/
```

### Preview build locally

```bash
cd frontend
npm run preview
# Usually runs on http://localhost:4173
```

### Recommended Deployment Flow

1. **For Quick Deploy**: Use **Vercel** or **Netlify** with GitHub integration
2. **For Open Source**: Use **GitHub Pages**
3. **For Performance**: Use **Cloudflare Pages**
4. **For Quick Testing**: Use **Surge.sh**

---

## 🎯 After Deployment

1. **Test your deployed app**:

   - Visit the deployed URL
   - Connect wallet (Freighter)
   - Enter your contract ID
   - Test all functionality

2. **Set up custom domain** (optional):

   - Most platforms support custom domains
   - Add your domain in platform settings
   - Update DNS records as instructed

3. **Set up automatic deployments**:
   - Connect your Git repository
   - New pushes to `main` branch auto-deploy
   - Preview deployments for pull requests

---

## 💡 Recommendations

**For this project, I recommend:**

1. **Vercel** - Best balance of ease and features
2. **Netlify** - Great alternative with similar features
3. **Cloudflare Pages** - If you need global performance

All three have excellent free tiers and will work perfectly for your warranty tracker!
