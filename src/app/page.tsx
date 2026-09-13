"use client";

/**
 * Home page — Audio Word Cloud application.
 *
 * State machine: idle → preview → (analysing) → results
 * The user can record or upload audio, preview it, then analyse.
 */

import { useState, useCallback } from "react";
import AudioRecorder from "@/components/AudioRecorder";
import AudioUploader from "@/components/AudioUploader";
import AudioPreview from "@/components/AudioPreview";
import ErrorAlert from "@/components/ErrorAlert";

// ── Types ────────────────────────────────────────────────────────────

type AppState = "idle" | "preview" | "analysing" | "results";

interface AudioData {
  blob: Blob;
  filename: string;
}

interface Concept {
  term: string;
  prominence: number;
}

// ── Component ────────────────────────────────────────────────────────

export default function Home() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [concepts, setConcepts] = useState<Concept[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"record" | "upload">("record");

  // ── Handle recording complete ────────────────────────────────────
  const handleRecordingComplete = useCallback((blob: Blob, filename: string) => {
    setAudioData({ blob, filename });
    setAppState("preview");
    setError(null);
  }, []);

  // ── Handle file upload ───────────────────────────────────────────
  const handleFileAccepted = useCallback((file: File) => {
    setAudioData({ blob: file, filename: file.name });
    setAppState("preview");
    setError(null);
  }, []);

  // ── Discard and reset ────────────────────────────────────────────
  const handleDiscard = useCallback(() => {
    setAudioData(null);
    setConcepts(null);
    setAppState("idle");
    setError(null);
  }, []);

  // ── Analyse audio ────────────────────────────────────────────────
  const handleAnalyse = useCallback(async () => {
    if (!audioData) return;

    setAppState("analysing");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("audio", audioData.blob, audioData.filename);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setAppState("preview");
        return;
      }

      setConcepts(data.concepts);
      setAppState("results");
    } catch {
      setError("Connection failed. Check your internet connection and try again.");
      setAppState("preview");
    }
  }, [audioData]);

  return (
    <div className="flex flex-col flex-1 items-center min-h-screen">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="w-full py-6 px-6 text-center">
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--foreground)" }}>
            Audio Word Cloud
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>
          Record or upload audio • AI extracts key concepts • Visualise as a word cloud
        </p>
      </header>

      {/* ── Main content ────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-lg px-4 pb-12 gap-6">

        {/* Error alert */}
        {error && (
          <ErrorAlert message={error} onDismiss={() => setError(null)} />
        )}

        {/* ── IDLE: Show record/upload tabs ──────────────────────── */}
        {appState === "idle" && (
          <div className="animate-fade-in flex flex-col items-center gap-6 w-full">
            {/* Tab switcher */}
            <div
              className="flex rounded-full p-1 gap-1"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <button
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeTab === "record" ? "" : ""
                }`}
                style={{
                  background: activeTab === "record" ? "var(--accent)" : "transparent",
                  color: activeTab === "record" ? "white" : "var(--foreground-muted)",
                }}
                onClick={() => setActiveTab("record")}
                id="tab-record"
              >
                Record
              </button>
              <button
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200`}
                style={{
                  background: activeTab === "upload" ? "var(--accent)" : "transparent",
                  color: activeTab === "upload" ? "white" : "var(--foreground-muted)",
                }}
                onClick={() => setActiveTab("upload")}
                id="tab-upload"
              >
                Upload
              </button>
            </div>

            {/* Active tab content */}
            {activeTab === "record" ? (
              <AudioRecorder onComplete={handleRecordingComplete} />
            ) : (
              <AudioUploader onFileAccepted={handleFileAccepted} />
            )}
          </div>
        )}

        {/* ── PREVIEW: Show audio preview + action buttons ────────── */}
        {(appState === "preview" || appState === "analysing") && audioData && (
          <AudioPreview
            audio={audioData.blob}
            filename={audioData.filename}
            onAnalyse={handleAnalyse}
            onDiscard={handleDiscard}
            isAnalysing={appState === "analysing"}
          />
        )}

        {/* ── RESULTS: Placeholder for Phase 6 word cloud ────────── */}
        {appState === "results" && concepts && (
          <div className="animate-fade-in flex flex-col items-center gap-6 w-full">
            <div
              className="w-full rounded-2xl p-8 text-center"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <p className="text-sm font-medium mb-4" style={{ color: "var(--foreground)" }}>
                ✅ Analysis Complete — {concepts.length} concepts extracted
              </p>

              {/* Temporary concept list (Phase 6 will replace with word cloud) */}
              <div className="flex flex-wrap justify-center gap-2">
                {concepts.map((c) => (
                  <span
                    key={c.term}
                    className="px-3 py-1.5 rounded-full text-sm"
                    style={{
                      background: "var(--accent-soft)",
                      color: "var(--accent)",
                      fontSize: `${Math.max(0.7, 0.6 + c.prominence * 0.08)}rem`,
                      fontWeight: c.prominence >= 7 ? 600 : 400,
                    }}
                  >
                    {c.term}
                  </span>
                ))}
              </div>
            </div>

            <button className="btn-secondary" onClick={handleDiscard} id="start-over-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Start Over
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
