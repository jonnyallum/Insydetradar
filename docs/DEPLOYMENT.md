# Insydetradar Deployment Guide

This document outlines the protocol for deploying both the Backend API and the Mobile Application.

## 1. Backend API (Vercel or Render)
The backend is a Node.js Express server. 

### Vercel Deployment (Recommended)
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the root directory.
3. In the Vercel Dashboard, add yours Environment Variables:
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ALPACA_API_KEY`
   - `ALPACA_SECRET_KEY`
   - `STRIPE_SECRET_KEY`
   - `COOKIE_SECRET`

### Hostinger (SSH/Rsync)
If using the AgOS `/deploy` workflow, ensure your `scripts/deploy.sh` is configured with your Hostinger credentials.

---

## 2. Mobile Application (Expo EAS)
We use Expo Application Services (EAS) for builds.

### Setup
1. Install EAS CLI: `npm i -g eas-cli`
2. Login: `eas login`
3. Configure Project: `eas build:configure`

### Building for Production
- **Android (APK/AAB):**
  ```bash
  eas build --platform android --profile production
  ```
- **iOS (IPA):**
  ```bash
  eas build --platform ios --profile production
  ```

---

## 3. Post-Deployment Verification
After deployment, run the tactical test scripts to ensure all systems are communicating:

1. **Broker Connectivity:**
   ```bash
   npx tsx scripts/test-broker-connection.ts
   ```
2. **Signal Intelligence:**
   ```bash
   npx tsx scripts/test-signal-generator.ts
   ```
3. **API Health:**
   Check `https://your-api.com/api/health`
