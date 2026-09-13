"use client";

/**
 * ErrorAlert — Displays a user-friendly error message with a dismiss button.
 */

interface ErrorAlertProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  return (
    <div
      className="animate-fade-in w-full max-w-md rounded-xl px-4 py-3 flex items-start gap-3"
      style={{
        background: "var(--danger-soft)",
        color: "var(--danger)",
        border: "1px solid var(--danger)",
      }}
      role="alert"
      id="error-alert"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 mt-0.5"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>

      <p className="text-sm flex-1">{message}</p>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 hover:opacity-70 transition-opacity"
          aria-label="Dismiss error"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}
