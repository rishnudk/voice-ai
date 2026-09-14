# Voice AI — Semantic Audio Intelligence

Voice AI is a web application that transforms spoken audio into structured visual knowledge. It accepts live microphone recordings or uploaded audio files, transcribes the speech, extracts core concepts with prominence scores, and visualizes the discussion as an interactive word cloud.

---

## How It Works

1. **Audio Input**: Record directly from your microphone in the browser or upload an audio file (supports MP3, WAV, M4A, AAC, OGG, WEBM, and FLAC up to 25 MB / 10 minutes).
2. **Server Validation**: The Next.js API route validates the file format, payload size, and audio duration using audio metadata parsing.
3. **Speech Transcription**: The audio buffer is sent to the transcription service, transcribing speech into accurate, verbatim text while screening out silence or background noise.
4. **Semantic Concept Extraction**: The transcript is analyzed to identify key themes, topics, and ideas, assigning each concept a prominence score from 1 (minor mention) to 10 (central theme).
5. **Interactive Visualization**: Results are presented in real time with an animated D3 word cloud, interactive concept chips, and prominence breakdown rankings.

---

## AI Service Used

- **Google Gemini** (`gemini-3.6-flash` / Gemini Flash):
  - **Audio Transcription**: High-accuracy speech-to-text processing audio payloads up to 25 MB.
  - **Semantic Analysis**: Extracts structured concept arrays with prominence ratings (1–10) using Gemini's native JSON schema constraints.

---

## Libraries & Technologies

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack) with [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Visualization**: [d3-cloud](https://github.com/jasondavies/d3-cloud) for weighted word cloud layout generation
- **Audio Metadata**: [music-metadata](https://github.com/Borewit/music-metadata) for server-side audio duration and format inspection
- **Large File Storage**: [@vercel/blob](https://vercel.com/docs/storage/vercel-blob) for direct client uploads up to 25 MB (bypassing serverless function limits)

---

## Getting Started

### 1. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Google AI Studio (Audio transcription & Concept extraction)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash

# Optional for local / Required on Vercel for uploads > 4.5 MB:
# Automatically provisioned when you attach Vercel Blob in project settings
BLOB_READ_WRITE_TOKEN=your_blob_token_here
```

### 2. Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
