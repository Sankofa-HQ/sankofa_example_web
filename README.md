# Sankofa Web Sandbox (React + Vite)

A modern, interactive sandbox for the **Sankofa Web SDK**. Exercises every product the web suite ships — Analytics, Catch (Crashlytics + Sentry merged), Switch, Config, Pulse, Replay (rrweb) — against a local or remote Sankofa engine.

---

## ✨ Features

- **Analytics sandbox** — track / identify / setPerson / reset with a live diagnostic snapshot.
- **Catch crash gallery** — 13+ realistic frontend crash classes (TypeError, ReferenceError, unhandled promise, fetch error, JSON-parse on HTML, stack overflow, custom business errors) plus `Sankofa.log()`, `withScope` (single + nested), and `beforeSend` demos.
- **Flags + Config lab** — live decision tables for every demo flag + config key with onChange listeners.
- **Pulse lab** — triggers + previews the in-app survey runtime.
- **Session Replay (rrweb)** — high-fidelity capture with the `rrwebReplayPlugin`. Real-time status indicator in the UI.
- **Runtime diagnostics** — diagnostic snapshot view shows the SDK's queue, identity, and module state.

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js 20+**
- **NPM** or **Yarn**
- **Sankofa Engine** running locally on port 8080

### 2. Setup

```bash
cp .env.example .env.local
npm install --legacy-peer-deps
```

### 3. Configuration

Edit `.env.local`:

```env
VITE_SANKOFA_API_KEY=your_project_api_key_here
VITE_SANKOFA_ENDPOINT=http://localhost:8080
```

### 4. Run

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## 🔍 What it demonstrates

### Phase B `beforeSend` (`src/lib/SankofaProvider.tsx`)

`catchPlugin({ beforeSend: ... })` is wired at init:

- Drops events whose message contains `"[noise]"`.
- Scrubs `user_email` from `extra`.

### Phase A / B demos (`src/CatchCrashGallery.tsx`)

Buttons covering:

- **`Sankofa.log()`** — Crashlytics-style breadcrumb that rides on the next captured exception.
- **`withScope` (single)** — tags + level + extras attached to ONE capture only.
- **`withScope` (nested)** — inner scope inherits + extends outer scope tags.
- **`beforeSend` demo** — fires events the configured hook should drop or scrub.

Every Catch scenario carries the active `flag_snapshot` + `config_snapshot` from `@sankofa/switch` + `@sankofa/config` automatically — the dashboard shows which flags were ON when an error fired with no host wiring.

---

## 📂 Key code references

| File | What |
|---|---|
| `src/lib/SankofaProvider.tsx` | `Sankofa.init` + every plugin (`switchPlugin`, `configPlugin`, `catchPlugin` with `beforeSend`, `pulsePlugin`, `rrwebReplayPlugin`). |
| `src/CatchCrashGallery.tsx` | All Catch scenarios including Phase A/B. |
| `src/pages/Overview.tsx` | Analytics sandbox + diagnostic snapshot. |
| `src/pages/Flags.tsx` | Live Switch + Config decision tables. |
| `src/PulseLabPanel.tsx` | Pulse survey runtime. |

---

## 🔧 CORS

Make sure the Go engine's `CORS_ALLOWED_ORIGINS` includes `http://localhost:5173`. Otherwise the browser blocks event uploads.

---

## Documentation

Full Web SDK reference: [docs.sankofa.dev/sdks/web](https://docs.sankofa.dev/sdks/web/overview).

---

## 🛡 License

MIT.
