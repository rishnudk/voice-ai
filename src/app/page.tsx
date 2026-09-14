"use client";

/**
 * Home page — Audio Word Cloud application.
 *
 * State machine: idle → preview → analysing → results
 * The user can record or upload audio, preview it, then analyse.
 */

import { useState, useCallback } from "react";
import AudioRecorder from "@/components/AudioRecorder";
import AudioUploader from "@/components/AudioUploader";
import AudioPreview from "@/components/AudioPreview";
import ProcessingStatus from "@/components/ProcessingStatus";
import WordCloudView from "@/components/WordCloudView";
import ErrorAlert from "@/components/ErrorAlert";
import { upload } from "@vercel/blob/client";

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
      let response: Response;
      const isLargeFile = audioData.blob.size > 4 * 1024 * 1024;

      if (isLargeFile) {
        let blobUrl: string;
        try {
          const safeName =
            audioData.filename.replace(/[^a-zA-Z0-9._-]/g, "_") || "audio.mp3";

          let blob;
          try {
            blob = await upload(safeName, audioData.blob, {
              access: "private",
              handleUploadUrl: "/api/upload",
            });
          } catch (privErr: unknown) {
            const privMsg = (privErr as Error)?.message || "";
            if (
              privMsg.includes("public store") ||
              privMsg.includes("public access")
            ) {
              blob = await upload(safeName, audioData.blob, {
                access: "public",
                handleUploadUrl: "/api/upload",
              });
            } else {
              throw privErr;
            }
          }
          blobUrl = blob.url;
        } catch (blobErr: unknown) {
          const msg = (blobErr as Error)?.message || "";
          console.error("[analyze] Blob upload error:", blobErr);

          // Query the diagnostic endpoint to show the exact status from Vercel
          try {
            const diagRes = await fetch("/api/upload");
            const diag = (await diagRes.json()) as {
              configured?: boolean;
              message?: string;
              detectedKeys?: string[];
            };

            if (!diag.configured) {
              setError(
                `Vercel Blob credentials not found on this deployment. ${diag.message}`
              );
              setAppState("preview");
              return;
            }
          } catch {
            // Ignore diag fetch errors
          }

          setError(
            msg ||
              "Failed to upload audio to storage. Please check Vercel Blob settings and redeploy."
          );
          setAppState("preview");
          return;
        }

        try {
          response = await fetch("/api/analyze", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              blobUrl,
              filename: audioData.filename,
              mimeType: audioData.blob.type,
            }),
            signal: AbortSignal.timeout(65000),
          });
        } catch (fetchErr: unknown) {
          const isTimeout =
            (fetchErr as Error)?.name === "TimeoutError" ||
            (fetchErr as Error)?.message?.toLowerCase().includes("timeout") ||
            (fetchErr as Error)?.message?.toLowerCase().includes("aborted");

          setError(
            isTimeout
              ? "Audio processing timed out after 65 seconds. Vercel enforces a 60-second limit on serverless functions. Please try a shorter recording (e.g. under 5 minutes)."
              : "Connection failed. Check your internet connection and try again."
          );
          setAppState("preview");
          return;
        }
      } else {
        // Direct multipart upload for files <= 4 MB (fastest)
        const formData = new FormData();
        formData.append("audio", audioData.blob, audioData.filename);

        try {
          response = await fetch("/api/analyze", {
            method: "POST",
            body: formData,
            signal: AbortSignal.timeout(65000),
          });
        } catch (fetchErr: unknown) {
          const isTimeout =
            (fetchErr as Error)?.name === "TimeoutError" ||
            (fetchErr as Error)?.message?.toLowerCase().includes("timeout") ||
            (fetchErr as Error)?.message?.toLowerCase().includes("aborted");

          setError(
            isTimeout
              ? "Audio processing timed out. Please try a shorter audio clip."
              : "Connection failed. Check your internet connection and try again."
          );
          setAppState("preview");
          return;
        }
      }

      let data: { error?: string; concepts?: unknown[] } | null = null;
      try {
        data = await response.json();
      } catch {
        // Handle non-JSON responses from hosting infrastructure (e.g. Vercel)
        if (response.status === 413) {
          setError(
            "This file exceeds Vercel's 4.5 MB serverless limit (Vercel enforces a 4.5 MB maximum request body). Please use an audio file under 4.5 MB."
          );
          setAppState("preview");
          return;
        }
        if (response.status === 504) {
          setError(
            "Processing timed out (504). Vercel serverless functions have a 60s limit. Please try a shorter recording (e.g. under 5 minutes)."
          );
          setAppState("preview");
          return;
        }
        setError(
          `Server returned status ${response.status}. Please verify your Vercel Environment Variables.`
        );
        setAppState("preview");
        return;
      }

      if (!response.ok) {
        setError(data?.error || "Something went wrong. Please try again.");
        setAppState("preview");
        return;
      }

      setConcepts(data?.concepts as any);
      setAppState("results");
    } catch (err) {
      console.error("[analyze] Fetch error:", err);
      const msg =
        (err as Error)?.message || "Failed to process audio. Please try again.";
      setError(msg);
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
      <main className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl px-4 pb-12 gap-6">

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
                className="px-5 py-2 rounded-full text-sm font-medium transition-all duration-200"
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
                className="px-5 py-2 rounded-full text-sm font-medium transition-all duration-200"
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
        {appState === "preview" && audioData && (
          <AudioPreview
            audio={audioData.blob}
            filename={audioData.filename}
            onAnalyse={handleAnalyse}
            onDiscard={handleDiscard}
          />
        )}

        {/* ── ANALYSING: Show multi-step processing status ────────── */}
        {appState === "analysing" && (
          <ProcessingStatus isActive={true} onCancel={handleDiscard} />
        )}

        {/* ── RESULTS: Show word cloud + download ────────────────── */}
        {appState === "results" && concepts && (
          <WordCloudView concepts={concepts} onReset={handleDiscard} />
        )}
      </main>
    </div>
  );
}
