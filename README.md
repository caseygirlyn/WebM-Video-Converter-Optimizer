# VELOCITY.WEBM — WebM Video Converter & Web Optimizer

A high-performance video transcoding and web optimization application built to convert videos (MP4, MOV, MKV, AVI, etc.) into ultra-efficient WebM (VP9/Opus) format with maximum payload reduction and fast Largest Contentful Paint (LCP) for modern websites.

---

## 🚀 Key Features

### 1. Smart Web Optimization Presets
- **Auto Web Optimizer (CRF 31)**: Automatically balances crisp visual fidelity with minimum payload using adaptive VP9 Constant Rate Factor, smart downscaling for heavy 4K/2K streams, and Opus audio compression.
- **Hero & Background Loop Preset**: Tailored for muted homepage background videos (audio track removed, clamped to 30 FPS, aggressive CRF 36) to achieve ultra-lightweight 1–3 MB payloads.
- **High Fidelity Web Preset**: Preserves dynamic range and crisp details for design portfolios, product demos, and photography showcases with Opus 128 kbps stereo.
- **Target File Size Budget**: Allows setting a strict file size cap (e.g. 2 MB, 5 MB, 10 MB, 25 MB) with 2-pass bitrate matching.
- **Pro Fine-Tuning Controls**: Granular adjustments for CRF (18–45), resolution scalers (4K down to 360p), frame rates (24, 30, 60 FPS), audio channels, duration trimming, and playback speeds.

### 2. Real-Time Telemetry & Progress Monitoring
- Live encoder metrics streaming real-time FPS, speed multiplier, current timemark, and multi-stage indicators (Probing → VP9 Multi-threading → Web Optimization → WebP Poster Generation).

### 3. Interactive Video Comparison Player
- **Split-Screen Slider Diff**: Interactive draggable swipe divider comparing original vs. optimized WebM side-by-side on the exact same video frame.
- **Side-by-Side & A/B Flip Modes**: Synchronized seek bar, synchronized play/pause, volume controls, and 1x/1.5x/2x magnification zoom to inspect compression artifacts.

### 4. Web Vitals & Performance Analytics
- Calculates percentage payload reduction, estimated 4G/3G mobile LCP render speedups, and CDN egress bandwidth saved over 10,000 pageviews.
- Automatic generation and download of WebP poster thumbnails.
- Generates ready-to-use HTML5, React, and Tailwind CSS embed snippets configured with preload hints and responsive aspect ratios.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti
- **Backend / Transcoding Engine**: Node.js, Express, Fluent-FFmpeg (FFmpeg + FFprobe), Server-Sent Events (SSE) for live encoding telemetry
- **Design System**: Bento Grid dark theme (`#09090B` canvas, `#111114` modular bento tiles, indigo and monospace telemetry accents)

---

## 🏃 Getting Started

### Prerequisites
- Node.js 18+ installed
- FFmpeg and FFprobe installed on your system (or available in container environment)

### Installation & Run

1. Clone the repository or open the project folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server (runs on port `3000`):
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

To create a production build:
```bash
npm run build
```

To run the production server:
```bash
npm start
```

---

## 📄 License

MIT License
