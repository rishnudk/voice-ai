"use client";

/**
 * ProcessingStatus — Multi-step loading state for the analysis pipeline.
 *
 * Displays sequential progress messages with animated transitions.
 */

import { useState, useEffect } from "react";

const STEPS = [
  { label: "Uploading audio…", icon: "upload", duration: 1500 },
  { label: "Transcribing audio…", icon: "mic", duration: 3000 },
  { label: "Understanding the session…", icon: "brain", duration: 2000 },
  { label: "Building word cloud…", icon: "cloud", duration: 1000 },
];

interface ProcessingStatusProps {
  /** When true, the processing animation is active. */
  isActive: boolean;
}

function StepIcon({ icon, isActive }: { icon: string; isActive: boolean }) {
  const stroke = isActive ? "var(--accent)" : "var(--foreground-muted)";
  const opacity = isActive ? 1 : 0.3;

  const icons: Record<string, React.ReactNode> = {
    upload: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity }}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
    mic: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity }}>
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      </svg>
    ),
    brain: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity }}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    ),
    cloud: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity }}>
        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
      </svg>
    ),
  };

  return <>{icons[icon] || null}</>;
}

export default function ProcessingStatus({ isActive }: ProcessingStatusProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    let step = 0;

    const advance = () => {
      step++;
      if (step < STEPS.length) {
        setCurrentStep(step);
        timer = setTimeout(advance, STEPS[step].duration);
      }
    };

    let timer = setTimeout(advance, STEPS[0].duration);

    return () => {
      clearTimeout(timer);
      setCurrentStep(0);
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="animate-fade-in flex flex-col items-center gap-6 w-full max-w-sm py-8">
      {/* Current step label */}
      <div className="flex items-center gap-3">
        <svg
          className="animate-spin"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
        <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
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

      {/* Step counter */}
      <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
        Step {currentStep + 1} of {STEPS.length}
      </p>
    </div>
  );
}
