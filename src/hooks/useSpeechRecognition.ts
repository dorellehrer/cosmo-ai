'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

export interface SpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  autoSubmit?: boolean;
  autoSubmitDelay?: number; // ms to wait after speech ends before auto-submit
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetTranscript: () => void;
  hasPermission: boolean | null;
}

const DEFAULT_OPTIONS: SpeechRecognitionOptions = {
  language: 'en-US',
  continuous: true,
  interimResults: true,
  autoSubmit: true,
  autoSubmitDelay: 1500,
};

export function useSpeechRecognition(
  options: SpeechRecognitionOptions = {},
  onAutoSubmit?: (transcript: string) => void
): UseSpeechRecognitionReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const autoSubmitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const finalTranscriptRef = useRef('');

  // Check browser support
  useEffect(() => {
    const SpeechRecognitionAPI = 
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);
  }, []);

  // Clear auto-submit timer
  const clearAutoSubmitTimer = useCallback(() => {
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }
  }, []);

  // Start auto-submit timer
  const startAutoSubmitTimer = useCallback(() => {
    clearAutoSubmitTimer();
    if (opts.autoSubmit && opts.autoSubmitDelay && onAutoSubmit) {
      autoSubmitTimerRef.current = setTimeout(() => {
        if (finalTranscriptRef.current.trim()) {
          onAutoSubmit(finalTranscriptRef.current.trim());
          finalTranscriptRef.current = '';
          setTranscript('');
          setInterimTranscript('');
        }
      }, opts.autoSubmitDelay);
    }
  }, [opts.autoSubmit, opts.autoSubmitDelay, onAutoSubmit, clearAutoSubmitTimer]);

  // Initialize recognition
  const initRecognition = useCallback(() => {
    if (!isSupported) return null;

    const SpeechRecognitionAPI = 
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = opts.continuous ?? true;
    recognition.interimResults = opts.interimResults ?? true;
    recognition.lang = opts.language ?? 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      clearAutoSubmitTimer();
      
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalText) {
        finalTranscriptRef.current += finalText;
        setTranscript(finalTranscriptRef.current);
        startAutoSubmitTimer();
      }
      
      setInterimTranscript(interimText);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      
      switch (event.error) {
        case 'not-allowed':
          setError('Microphone access denied. Please allow microphone access in your browser settings.');
          setHasPermission(false);
          break;
        case 'no-speech':
          // This is not really an error, just no speech detected
          startAutoSubmitTimer();
          break;
        case 'audio-capture':
          setError('No microphone found. Please connect a microphone and try again.');
          break;
        case 'network':
          setError('Network error. Please check your connection and try again.');
          break;
        case 'aborted':
          // User stopped, not an error
          break;
        default:
          setError(`Speech recognition error: ${event.error}`);
      }
      
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // If we're still supposed to be listening, restart
      if (isListening && recognitionRef.current) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      setHasPermission(true);
    };

    return recognition;
  }, [isSupported, opts.continuous, opts.interimResults, opts.language, isListening, clearAutoSubmitTimer, startAutoSubmitTimer]);

  const startListening = useCallback(async () => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.');
      return;
    }

    setError(null);
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');

    // Request microphone permission first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);
    } catch (err) {
      console.error('Microphone permission error:', err);
      setError('Microphone access denied. Please allow microphone access to use voice input.');
      setHasPermission(false);
      return;
    }

    recognitionRef.current = initRecognition();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start recognition:', err);
        setError('Failed to start speech recognition. Please try again.');
      }
    }
  }, [isSupported, initRecognition]);

  const stopListening = useCallback(() => {
    clearAutoSubmitTimer();
    setIsListening(false);
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore errors when stopping
      }
      recognitionRef.current = null;
    }
  }, [clearAutoSubmitTimer]);

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    clearAutoSubmitTimer();
  }, [clearAutoSubmitTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAutoSubmitTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore errors when stopping
        }
      }
    };
  }, [clearAutoSubmitTimer]);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
    hasPermission,
  };
}
