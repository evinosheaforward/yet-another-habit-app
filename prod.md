# Production Notes

## Cloud Hosting (AWS EC2 + Elastic IP)

The production setup runs both the backend API and the web frontend on a single AWS EC2 instance with an Elastic IP.

### Architecture overview

```
                   ┌──────────────────────────────────┐
  Mobile app  ───▶ │  AWS EC2 (Elastic IP)             │
                   │                                    │
  Web browser ───▶ │  nginx (reverse proxy)             │
                   │    ├─ /api/*  → backend :3001      │
                   │    └─ /*      → static web files   │
                   │                                    │
                   │  Backend (Node.js, port 3001)      │
                   │    └─ MySQL database               │
                   └──────────────────────────────────┘
```

### 1. Provision AWS infrastructure

1. Launch an EC2 instance (Ubuntu 22.04+, t3.small or larger)
2. Allocate an **Elastic IP** and associate it with the instance
3. Configure the security group:
   - Inbound: 22 (SSH), 80 (HTTP), 443 (HTTPS)
   - Outbound: All
4. (Optional) Point a domain at the Elastic IP via DNS A record

### 2. Server setup

SSH into the instance and install dependencies:

```bash
# Node.js (LTS)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# MySQL
sudo apt-get install -y mysql-server
sudo mysql_secure_installation

# nginx
sudo apt-get install -y nginx

# pm2 (process manager for the backend)
sudo npm install -g pm2
```

### 3. Set up MySQL

```bash
sudo mysql -u root
```

```sql
CREATE DATABASE habitapp;
CREATE USER 'habitapp'@'localhost' IDENTIFIED BY 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON habitapp.* TO 'habitapp'@'localhost';
FLUSH PRIVILEGES;
```

### 4. Deploy the backend

Clone the repo and install dependencies:

```bash
cd /opt
git clone <your-repo-url> yet-another-habit-app
cd yet-another-habit-app
npm install
```

Create the production `.env` at `applications/backend/.env`:

```env
PORT=3001

DB_CLIENT=mysql2
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=habitapp
DB_PASSWORD=YOUR_SECURE_PASSWORD
DB_DATABASE=habitapp
DB_SSL=false

CORS_ORIGIN=https://yourdomain.com

FIREBASE_PROJECT_ID=yet-another-habit-app-c7ff0
FIREBASE_USE_EMULATOR=false
GOOGLE_APPLICATION_CREDENTIALS=/opt/yet-another-habit-app/firebase-service-account.json
```

Upload your Firebase service account JSON to the path above.

Run migrations and start:

```bash
cd applications/backend
npm run build
npm run migrate
pm2 start dist/server.js --name habit-backend --env-file .env
pm2 save
pm2 startup  # generates a command to run — follow its instructions
```

### 5. Build and deploy the web frontend

On the server (or locally, then `scp` the output):

```bash
cd applications/mobile

# Set production env vars for the web build
export EXPO_PUBLIC_USE_FIREBASE_EMULATOR=false
export EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyA2z0JsnbSyWhxq5RVVOTpChy50vhRW8MU
export EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=yet-another-habit-app-c7ff0.firebaseapp.com
export EXPO_PUBLIC_FIREBASE_PROJECT_ID=yet-another-habit-app-c7ff0
export EXPO_PUBLIC_FIREBASE_APP_ID=1:796738151214:web:be2ab812702d9b64d1d0bf
export EXPO_PUBLIC_API_BASE_URL=https://yourdomain.com/api

# Ad env vars (optional — omit to show no ads)
export EXPO_PUBLIC_ADSENSE_PUBLISHER_ID=ca-pub-YOUR_PUBLISHER_ID
export EXPO_PUBLIC_ADSENSE_SLOT_ID=YOUR_SLOT_ID

npx expo export --platform web
```

Copy the output to nginx's serving directory:

```bash
sudo rm -rf /var/www/habitapp
sudo cp -r dist /var/www/habitapp
```

### 6. Configure nginx

Create `/etc/nginx/sites-available/habitapp`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;  # or the Elastic IP

    # API — proxy to backend
    location /api/ {
        rewrite ^/api(/.*)$ $1 break;
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check passthrough
    location = /health {
        proxy_pass http://127.0.0.1:3001/health;
    }

    # Web frontend — static files
    location / {
        root /var/www/habitapp;
        try_files $uri $uri/ /index.html;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/habitapp /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

### 7. Set the mobile app's API base URL

Set `EXPO_PUBLIC_API_BASE_URL` at build time (for web export and EAS native builds):

```env
EXPO_PUBLIC_API_BASE_URL=https://yourdomain.com/api
# or if using bare IP:
EXPO_PUBLIC_API_BASE_URL=http://YOUR_ELASTIC_IP/api
```

nginx strips the `/api` prefix (via the `rewrite` rule), so the backend routes work unchanged. No code changes needed — the env var is read automatically by `api/baseUrl.ts`.

### 8. HTTPS (optional but recommended)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Certbot auto-configures nginx for SSL and sets up auto-renewal.

### 9. Verify

```bash
# Backend health check
curl http://YOUR_ELASTIC_IP/health
# Should return: {"ok":true}

# Web frontend
# Visit http://YOUR_ELASTIC_IP in a browser — should load the app
```

---

## Ads

The app uses Google AdMob for native (Android/iOS) and Google AdSense for web. In development, test ad IDs are used automatically — no configuration needed.

### Native (Android / iOS) — AdMob

#### 1. Create AdMob account and ad units

1. Sign up at https://admob.google.com
2. Register your app for Android and iOS
3. Note your **App IDs** (format: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`)
4. Create a **Banner** ad unit for each platform
5. Note the **Ad Unit IDs** (format: `ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX`)

#### 2. Replace test App IDs in `app.json`

In `applications/mobile/app.json`, replace the test IDs in the `react-native-google-mobile-ads` plugin:

```json
["react-native-google-mobile-ads", {
  "androidAppId": "ca-app-pub-YOUR_REAL_ANDROID_APP_ID",
  "iosAppId": "ca-app-pub-YOUR_REAL_IOS_APP_ID"
}]
```

These are **app-level** IDs (not ad unit IDs). They get baked into the native binary at build time.

#### 3. Set env vars for ad unit IDs

In your EAS build secrets or `.env.production`:

```env
EXPO_PUBLIC_ADMOB_BANNER_ANDROID=ca-app-pub-YOUR_REAL_ANDROID_AD_UNIT_ID
EXPO_PUBLIC_ADMOB_BANNER_IOS=ca-app-pub-YOUR_REAL_IOS_AD_UNIT_ID
```

#### 4. Build with EAS

```bash
cd applications/mobile

# Production build
eas build --platform android --profile production
eas build --platform ios --profile production
```

The ad unit IDs are read at runtime from the env vars. The app IDs from `app.json` are compiled into the native binary by the config plugin.

### Web — AdSense

#### 1. Create AdSense account

1. Sign up at https://adsense.google.com
2. Add and verify your site
3. Note your **Publisher ID** (format: `ca-pub-XXXXXXXXXXXXXXXX`)
4. Create a **Display ad unit** and note the **Slot ID**

#### 2. Set env vars at web build time

These must be set when you run `npx expo export --platform web` (see step 5 above):

```env
EXPO_PUBLIC_ADSENSE_PUBLISHER_ID=ca-pub-YOUR_PUBLISHER_ID
EXPO_PUBLIC_ADSENSE_SLOT_ID=YOUR_SLOT_ID
```

They are baked into the JS bundle at build time by Metro/Expo (all `EXPO_PUBLIC_*` vars are). No server-side env vars needed after the build.

#### 3. Build and deploy

The web export in step 5 above already covers this. Just make sure the AdSense env vars are exported before building.

### How it works

| Environment | Ads shown | Source of ad IDs |
|---|---|---|
| Expo Go | None (graceful fallback) | N/A |
| Dev client (`npx expo run:android`) | Google test ads | Hardcoded test IDs |
| Web (`npm run web`) | Placeholder box | N/A |
| Production native (EAS build) | Real AdMob ads | `EXPO_PUBLIC_ADMOB_BANNER_*` env vars |
| Production web | Real AdSense ads | `EXPO_PUBLIC_ADSENSE_*` env vars |

---

## Environment Variables Reference

### Backend (`applications/backend/.env`)

| Variable | Dev value | Prod value | Notes |
|---|---|---|---|
| `PORT` | `3001` | `3001` | Backend listen port |
| `DB_CLIENT` | `sqlite3` | `mysql2` | |
| `DB_HOST` | — | `127.0.0.1` | MySQL on same instance |
| `DB_PORT` | — | `3306` | |
| `DB_USER` | — | `habitapp` | |
| `DB_PASSWORD` | — | (secret) | |
| `DB_DATABASE` | — | `habitapp` | |
| `DB_SSL` | — | `false` | `true` if using RDS |
| `CORS_ORIGIN` | `http://localhost:8081` | `https://yourdomain.com` | |
| `FIREBASE_PROJECT_ID` | `yet-another-habit-app` | `yet-another-habit-app-c7ff0` | |
| `FIREBASE_USE_EMULATOR` | `true` | `false` | |
| `GOOGLE_APPLICATION_CREDENTIALS` | (local path) | `/opt/.../service-account.json` | Firebase Admin SDK key |

### Mobile (`applications/mobile/.env`)

| Variable | Dev value | Prod value | Notes |
|---|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | (empty) | `https://yourdomain.com/api` | Backend API URL |
| `EXPO_PUBLIC_USE_FIREBASE_EMULATOR` | `true` | `false` | |
| `EXPO_PUBLIC_FIREBASE_API_KEY` | (same) | (same) | |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | (same) | (same) | |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | (same) | (same) | |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | (same) | (same) | |
| `EXPO_PUBLIC_ADMOB_BANNER_ANDROID` | (empty) | Ad unit ID | Native ads |
| `EXPO_PUBLIC_ADMOB_BANNER_IOS` | (empty) | Ad unit ID | Native ads |
| `EXPO_PUBLIC_ADSENSE_PUBLISHER_ID` | (empty) | Publisher ID | Web ads |
| `EXPO_PUBLIC_ADSENSE_SLOT_ID` | (empty) | Slot ID | Web ads |
