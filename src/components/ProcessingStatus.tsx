"use client";

/**
 * ProcessingStatus — Multi-step loading state for the analysis pipeline.
 *
 * Displays sequential progress messages with animated transitions,
 * an active elapsed timer, and contextual guidance for multi-minute audio files.
 */

import { useState, useEffect } from "react";

const STEPS = [
  { label: "Uploading audio to storage…", icon: "upload", duration: 4000 },
  { label: "Transcribing speech with AI…", icon: "mic", duration: 18000 },
  { label: "Extracting concepts & themes…", icon: "brain", duration: 10000 },
  { label: "Generating word cloud…", icon: "cloud", duration: 8000 },
];

interface ProcessingStatusProps {
  /** When true, the processing animation is active. */
  isActive: boolean;
  onCancel?: () => void;
}

function StepIcon({ icon, isActive }: { icon: string; isActive: boolean }) {
  const iconColor = isActive ? "var(--accent)" : "var(--foreground-muted)";

  switch (icon) {
    case "upload":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      );
    case "mic":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
        </svg>
      );
    case "brain":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z" />
          <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z" />
        </svg>
      );
    case "cloud":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        </svg>
      );
    default:
      return null;
  }
}

export default function ProcessingStatus({ isActive, onCancel }: ProcessingStatusProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Active elapsed seconds counter
  useEffect(() => {
    if (!isActive) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]);

  // Step advancement timer
  useEffect(() => {
    if (!isActive) {
      setCurrentStep(0);
      return;
    }

    let step = 0;

    const advance = () => {
      if (step < STEPS.length - 1) {
        step += 1;
        setCurrentStep(step);
        timer = setTimeout(advance, STEPS[step].duration);
      }
    };

    let timer = setTimeout(advance, STEPS[0].duration);

    return () => clearTimeout(timer);
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="animate-fade-in flex flex-col items-center gap-5 w-full max-w-md py-8">
      {/* Current step label + spinner */}
      <div className="flex items-center gap-3">
        <svg
          className="animate-spin"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
        >
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
        <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          {STEPS[currentStep].label}
        </span>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 w-full max-w-xs">
        {STEPS.map((step, i) => (
          <div key={step.label} className="flex items-center flex-1 gap-2">
            <div className="flex flex-col items-center gap-1.5">
              <StepIcon icon={step.icon} isActive={i <= currentStep} />
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 h-0.5 rounded-full transition-colors duration-500"
                style={{
                  background: i < currentStep ? "var(--accent)" : "var(--border)",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step counter & elapsed timer */}
      <div className="flex items-center justify-between w-full max-w-xs text-xs" style={{ color: "var(--foreground-muted)" }}>
        <span>Step {currentStep + 1} of {STEPS.length}</span>
        <span className="font-mono">{elapsedSeconds}s elapsed</span>
      </div>

      {/* Helpful reassurance for long multi-minute audio */}
      {elapsedSeconds >= 10 && (
        <div
          className="animate-fade-in text-center px-4 py-2.5 rounded-lg text-xs leading-relaxed max-w-xs"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--foreground-muted)",
          }}
        >
          {elapsedSeconds < 45 ? (
            "Analyzing longer audio. Multi-minute speech (e.g. 5–10 mins) typically takes ~25–40 seconds to process. Please keep this page open."
          ) : (
            <span style={{ color: "var(--accent)" }}>
              Vercel serverless limit is 60s. Finalizing AI response…
            </span>
          )}
        </div>
      )}

      {/* Allow canceling if it exceeds 50 seconds */}
      {elapsedSeconds >= 50 && onCancel && (
        <button
          onClick={onCancel}
          className="text-xs px-3 py-1.5 rounded-md transition-colors"
          style={{
            background: "transparent",
            color: "var(--foreground-muted)",
            border: "1px solid var(--border)",
          }}
        >
          Cancel &amp; Try Shorter Audio
        </button>
      )}
    </div>
  );
}
