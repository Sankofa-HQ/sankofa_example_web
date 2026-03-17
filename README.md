# Sankofa Web Sandbox (React + Vite)

A modern, interactive sandbox for testing the **Sankofa Web SDK**. This example project demonstrates how to integrate real-time product analytics and high-fidelity session replays into a React application.

---

## ✨ Features

- **Interactive Sandbox**: Test event tracking and identity management in a live, visual environment.
- **Identity Resolution**: Complete flows for `identify()`, `setPerson()`, and `reset()`, allowing you to merge behavioral data with customer profiles dynamically.
- **Session Replay (RRWeb)**: High-fidelity session recording integrated with the SDK. The sandbox provides a real-time status indicator for the recording service.
- **Runtime Diagnostics**: A "Diagnostic Snapshot" view that shows the current internal state of the Sankofa client, including queued events and identity data.
- **Automated Pageview Tracking**: Demonstrates how the SDK automatically captures pageviews upon initialization.
- **Tailwind-Powered UI**: A clean, premium design with a dedicated dashboard for testing different tracking scenarios.

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js 20+**
- **NPM** or **Yarn**
- **Sankofa Engine** (Running locally on port 8080)

### 2. Setup
Copy the example environment file and install dependencies:
```bash
cp .env.example .env.local
npm install --legacy-peer-deps
```

### 3. Configuration
Edit `.env.local` and add your project's API key:
```env
VITE_SANKOFA_API_KEY=your_project_api_key_here
VITE_SANKOFA_ENDPOINT=http://localhost:8080
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to access the interactive sandbox.

---

## 📂 Key Code References

- **Initialization Loop**: See the `useEffect` hook in `src/App.tsx` for how the SDK is dynamically mounted and unmounted.
- **Event Tracking**: Explore `handleTrack` to see custom event payloads with properties.
- **Identity Management**: Check `handleIdentify` and `handlePeopleSet` for examples of setting customer traits (email, name, company, avatar).
- **Session Replay Integration**: See how the `rrwebReplayPlugin` is passed to the SDK during initialization.

---

## 🔧 CORS Note
If you are running this example locally, ensure the Go Engine's `CORS_ALLOWED_ORIGINS` includes `http://localhost:5173`. Otherwise, the browser may block event uploads.

---

## 🛡 License

This project is licensed under the MIT License.
