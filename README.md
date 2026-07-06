# 🗺️ Travel Guide AI

A smart, AI-driven Travel Guide & Planner application built with **React**, **TypeScript**, **Tailwind CSS**, and **Capacitor** on the frontend, powered by an **Express + Playwright + Gemini AI** backend.

The app scrapes real-time official tourism sites and travel blogs, digests the raw text using Google Gemini, and delivers structured travel plans, packing lists, city guides, transit tips, and an interactive AI travel assistant.

---

## ✨ Features

- **🔍 Smart Web Scraper**: Bypasses generic Wikipedia entries to search and scrape actual travel blogs and official tourism websites using Playwright & Cheerio.
- **🤖 Gemini AI Structuring**: Translates raw web content into structured JSON databases containing local landmarks, food recommendations, and local safety rules.
- **📅 Interactive Trip Planner**: Generates personalized day-by-day itineraries based on budget, duration, group type, and personal interests.
- **💬 Contextual AI Travel Assistant**: A chatbot that answers real-time questions about your destination.
- **🎒 AI Packing List Generator**: Custom packing lists based on destination weather, season, duration, and activities.
- **🗺️ Leaflet Map Integration**: Interactive maps displaying local landmarks, hotels, and transit routes.
- **📱 Mobile Ready (Capacitor)**: Packages into an Android application with built-in geolocation support.

---

## 📁 Repository Structure

```
travel-guide/
├── server/                     # Backend API Server
│   ├── src/
│   │   ├── routes/api.ts       # Express router & endpoints
│   │   ├── services/gemini.ts  # Google Gemini AI integrations
│   │   ├── services/scraper.ts # Yahoo search & Playwright scraper
│   │   └── index.ts            # App entry point
│   ├── Dockerfile              # Deployment Dockerfile (Playwright base)
│   └── package.json
│
├── src/                        # Frontend Web/Mobile Application
│   ├── components/             # Reusable UI components & maps
│   ├── hooks/                  # Geolocation and custom hooks
│   ├── pages/                  # Screen views (Welcome, Chat, Planner, etc.)
│   ├── services/               # API clients (Gemini, Weather, Overpass, API config)
│   ├── store/                  # Zustand state management
│   ├── utils/                  # Currency & helper functions
│   ├── App.tsx
│   └── main.tsx
│
├── android/                    # Capacitor Android Studio Project
├── capacitor.config.ts         # Capacitor App Settings
└── package.json                # Root dependency manager
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **Google Gemini API Key**

### 1. Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `server` directory and add your port and Gemini API Key:
   ```env
   PORT=3001
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
4. Start the backend developer server:
   ```bash
   npm run dev
   ```

The backend server will run at `http://localhost:3001`.

### 2. Frontend Setup

1. Return to the root folder:
   ```bash
   cd ..
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```

The frontend will run at `http://localhost:5173`. You can run both frontend and backend concurrently using the root dev command:
```bash
npm run dev
```

---

## 🚢 Deployment

### 1. Deploying the Backend (Render.com)

Render uses **Docker** to run Playwright along with all required system libraries for Chromium.

1. Create a **Web Service** on Render.
2. Link it to your GitHub Repository: `https://github.com/rajarajendra1103/tavel-guide.git`.
3. Configure the following fields:
   - **Root Directory**: `server`
   - **Runtime**: `Docker`
   - **Instance Type**: `Free`
4. Add the following **Environment Variables**:
   - `GEMINI_API_KEY` = `your_gemini_api_key`
   - `PORT` = `3001`
5. Click **Create Web Service**.

Once deployed, Render will provide a URL like `https://travel-guide-backend.onrender.com`.

### 2. Linking Frontend to Your Deployed Backend

To point your frontend to the deployed backend:

- **For local testing**: Open your app in the browser, open the browser console (F12), and run:
  ```javascript
  localStorage.setItem('BACKEND_SERVER_IP', 'https://travel-guide-backend.onrender.com');
  ```
- **For production builds**: Create a `.env` file in the root directory:
  ```env
  VITE_BACKEND_URL=https://travel-guide-backend.onrender.com
  ```
  Then compile the frontend:
  ```bash
  npm run build
  ```

---

## 📱 Mobile Build (Android)

This app is configured with **Capacitor** to build for Android.

1. Build the web project:
   ```bash
   npm run build
   ```
2. Copy the web assets to the Android project:
   ```bash
   npx cap sync android
   ```
3. Open the project in Android Studio:
   ```bash
   npx cap open android
   ```
4. In Android Studio, build/run the app on an emulator or a physical device.

---

## 🛠️ Built With

- **Frontend**: React (V19), TypeScript, Tailwind CSS, Lucide icons, Zustand, Leaflet Maps, React Query.
- **Backend**: Express, TypeScript, Playwright (Headless Crawler), Cheerio (HTML parser), `@google/generative-ai`.
- **Mobile wrapper**: Capacitor JS.
- **Hosting**: Render (Docker Runtime).
