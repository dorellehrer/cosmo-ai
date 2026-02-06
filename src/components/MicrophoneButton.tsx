'use client';

import React from 'react';

interface MicrophoneButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function MicrophoneButton({
  isListening,
  isSupported,
  onClick,
  disabled = false,
  className = '',
}: MicrophoneButtonProps) {
  if (!isSupported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative p-2.5 sm:p-3 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 ${
        isListening
          ? 'bg-red-500 hover:bg-red-600 text-white'
          : 'bg-white/10 hover:bg-white/20 text-white/60 hover:text-white'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
      aria-pressed={isListening}
    >
      {/* Pulsing animation when listening */}
      {isListening && (
        <>
          <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
          <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse-ring" />
        </>
      )}
      
      {/* Microphone icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative z-10"
        aria-hidden="true"
      >
        {isListening ? (
          // Stop icon when recording
          <>
            <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
          </>
        ) : (
          // Microphone icon when not recording
          <>
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </>
        )}
      </svg>
    </button>
  );
}

// Transcript display component
interface TranscriptDisplayProps {
  transcript: string;
  interimTranscript: string;
  isListening: boolean;
}

export function TranscriptDisplay({
  transcript,
  interimTranscript,
  isListening,
}: TranscriptDisplayProps) {
  if (!isListening && !transcript && !interimTranscript) {
    return null;
  }

  const hasContent = transcript || interimTranscript;

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-2 px-4 py-2 bg-slate-800/95 backdrop-blur-sm border border-white/10 rounded-xl animate-fade-in"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-2">
        {isListening && (
          <div className="flex gap-1 mt-1.5 shrink-0" aria-hidden="true">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" />
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {hasContent ? (
            <p className="text-sm text-white/90 break-words">
              {transcript}
              {interimTranscript && (
                <span className="text-white/50 italic">{interimTranscript}</span>
              )}
            </p>
          ) : (
            <p className="text-sm text-white/50 italic">Listening...</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Voice input error display
interface VoiceErrorProps {
  error: string;
  onDismiss: () => void;
}

export function VoiceError({ error, onDismiss }: VoiceErrorProps) {
  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-2 px-4 py-3 bg-red-500/20 border border-red-500/30 rounded-xl animate-fade-in"
      role="alert"
    >
      <div className="flex items-start gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-red-400 shrink-0 mt-0.5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
        <p className="flex-1 text-sm text-red-300">{error}</p>
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-300 transition-colors p-1"
          aria-label="Dismiss error"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" x2="6" y1="6" y2="18" />
            <line x1="6" x2="18" y1="6" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Browser not supported message
export function VoiceNotSupportedBanner() {
  return (
    <div
      className="px-4 py-3 bg-amber-500/20 border border-amber-500/30 rounded-xl mb-4"
      role="alert"
    >
      <div className="flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-amber-400 shrink-0"
          aria-hidden="true"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" x2="12" y1="9" y2="13" />
          <line x1="12" x2="12.01" y1="17" y2="17" />
        </svg>
        <p className="text-sm text-amber-200">
          Voice input is not supported in this browser. Try Chrome, Edge, or Safari for the best experience.
        </p>
      </div>
    </div>
  );
}
