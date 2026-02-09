// components/VoiceInput.tsx
// Voice input component with continuous recording and smart auto-stop

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Volume2, Square, AlertCircle } from "lucide-react";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onAppend?: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoStopOnTyping?: boolean;
  silenceTimeoutSeconds?: number;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onspeechend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function VoiceInput({
  onTranscript,
  onAppend,
  placeholder = "Click to speak...",
  disabled = false,
  className = "",
  autoStopOnTyping = true,
  silenceTimeoutSeconds = 30,
}: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [silenceWarning, setSilenceWarning] = useState(false);
  const [secondsUntilStop, setSecondsUntilStop] = useState<number | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  const userStoppedRef = useRef(false);
  const isListeningRef = useRef(false);
  const lastSpeechTimeRef = useRef<number>(Date.now());
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);

    return () => {
      stopVolumeMonitoring();
      clearSilenceTimers();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const clearSilenceTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    setSilenceWarning(false);
    setSecondsUntilStop(null);
  }, []);

  const startSilenceTimer = useCallback(() => {
    clearSilenceTimers();
    lastSpeechTimeRef.current = Date.now();

    const warningTime = (silenceTimeoutSeconds - 5) * 1000;
    warningTimerRef.current = setTimeout(() => {
      if (isListeningRef.current && !userStoppedRef.current) {
        setSilenceWarning(true);
        setSecondsUntilStop(5);
        
        let countdown = 5;
        const countdownInterval = setInterval(() => {
          countdown--;
          setSecondsUntilStop(countdown);
          if (countdown <= 0) {
            clearInterval(countdownInterval);
          }
        }, 1000);
      }
    }, warningTime);

    silenceTimerRef.current = setTimeout(() => {
      if (isListeningRef.current && !userStoppedRef.current) {
        stopListening();
      }
    }, silenceTimeoutSeconds * 1000);
  }, [silenceTimeoutSeconds, clearSilenceTimers]);

  const resetSilenceTimer = useCallback(() => {
    if (isListeningRef.current) {
      setSilenceWarning(false);
      setSecondsUntilStop(null);
      startSilenceTimer();
    }
  }, [startSilenceTimer]);

  const initializeRecognition = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;

    const recognition = new SpeechRecognitionAPI();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      setError(null);
      userStoppedRef.current = false;
      startSilenceTimer();
    };

    recognition.onspeechend = () => {
      // Do not stop - let silence timer handle auto-stop
    };

    recognition.onend = () => {
      if (userStoppedRef.current || !isListeningRef.current) {
        setIsListening(false);
        isListeningRef.current = false;
        stopVolumeMonitoring();
        clearSilenceTimers();
      } else {
        try {
          setTimeout(() => {
            if (isListeningRef.current && recognitionRef.current && !userStoppedRef.current) {
              recognitionRef.current.start();
            }
          }, 100);
        } catch (err) {
          setIsListening(false);
          isListeningRef.current = false;
          stopVolumeMonitoring();
          clearSilenceTimers();
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech") {
        return;
      }
      
      if (event.error === "aborted") {
        if (!userStoppedRef.current) {
          return;
        }
      }
      
      if (event.error === "not-allowed") {
        setError("Microphone access denied. Please enable in browser settings.");
        setIsListening(false);
        isListeningRef.current = false;
        stopVolumeMonitoring();
        clearSilenceTimers();
      } else if (event.error === "network") {
        setError("Network error. Please check your connection.");
        setTimeout(() => {
          if (isListeningRef.current && recognitionRef.current && !userStoppedRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              // Ignore
            }
          }
        }, 1000);
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(`Error: ${event.error}`);
        setIsListening(false);
        isListeningRef.current = false;
        stopVolumeMonitoring();
        clearSilenceTimers();
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      resetSilenceTimer();
      
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      setInterimTranscript(interim);
      if (final) {
        setTranscript((prev) => (prev ? prev + " " + final : final));
      }
    };

    return recognition;
  }, [startSilenceTimer, resetSilenceTimer, clearSilenceTimers]);

  const startVolumeMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 32;

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateVolume = () => {
        if (analyserRef.current && isListeningRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setVolume(avg / 255);
          animationRef.current = requestAnimationFrame(updateVolume);
        }
      };

      updateVolume();
    } catch (err) {
      console.error("Volume monitoring error:", err);
    }
  }, []);

  const stopVolumeMonitoring = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setVolume(0);
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported || disabled) return;

    userStoppedRef.current = false;
    setTranscript("");
    setInterimTranscript("");
    setError(null);
    setSilenceWarning(false);
    setSecondsUntilStop(null);

    const recognition = initializeRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
        startVolumeMonitoring();
      } catch (err) {
        setError("Failed to start voice recognition");
      }
    }
  }, [isSupported, disabled, initializeRecognition, startVolumeMonitoring]);

  const stopListening = useCallback(() => {
    userStoppedRef.current = true;
    isListeningRef.current = false;
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Ignore
      }
    }
    
    setIsListening(false);
    stopVolumeMonitoring();
    clearSilenceTimers();
  }, [stopVolumeMonitoring, clearSilenceTimers]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const handleSubmit = useCallback(() => {
    const finalText = (transcript + " " + interimTranscript).trim();
    if (finalText) {
      if (onAppend) {
        onAppend(finalText);
      } else {
        onTranscript(finalText);
      }
    }
    setTranscript("");
    setInterimTranscript("");
    stopListening();
  }, [transcript, interimTranscript, onTranscript, onAppend, stopListening]);

  const handleCancel = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    stopListening();
  }, [stopListening]);

  // Auto-stop when user starts typing
  useEffect(() => {
    if (!autoStopOnTyping || !isListening) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.isContentEditable;
      
      if (isInputField && isListening) {
        stopListening();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [autoStopOnTyping, isListening, stopListening]);

  if (!isSupported) {
    return (
      <div className={`flex items-center gap-2 text-xs text-white/40 ${className}`}>
        <MicOff className="w-4 h-4" />
        <span>Voice input not supported</span>
      </div>
    );
  }

  const displayText = (transcript + " " + interimTranscript).trim();

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={toggleListening}
        disabled={disabled}
        className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all ${
          isListening
            ? "bg-red-500/20 border-red-500/50 text-red-400"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
        } border ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        title={isListening ? "Stop recording" : "Start voice input"}
      >
        {isListening && (
          <motion.div
            className="absolute inset-0 rounded-xl border-2 border-red-400"
            animate={{
              scale: [1, 1 + volume * 0.3],
              opacity: [0.8, 0.2],
            }}
            transition={{
              duration: 0.15,
              ease: "linear",
            }}
          />
        )}

        {isListening ? (
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
          >
            <Mic className="w-5 h-5" />
          </motion.div>
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>

      <AnimatePresence>
        {(isListening || displayText) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full mb-2 left-0 right-0 min-w-[300px] max-w-[420px] p-4 rounded-xl bg-[#0d0e16] border border-white/20 shadow-xl z-50"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {isListening ? (
                  <>
                    <motion.div
                      className={`w-2 h-2 rounded-full ${silenceWarning ? 'bg-amber-500' : 'bg-red-500'}`}
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ repeat: Infinity, duration: silenceWarning ? 0.5 : 1 }}
                    />
                    <span className={`text-xs font-medium ${silenceWarning ? 'text-amber-400' : 'text-red-400'}`}>
                      {silenceWarning ? `Stopping in ${secondsUntilStop}s...` : 'Recording...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-emerald-400 font-medium">Voice Input</span>
                  </>
                )}
              </div>
              <button
                onClick={handleCancel}
                className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/60"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {silenceWarning && (
              <div className="mb-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 flex items-center gap-2">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>No speech detected. Recording will stop automatically.</span>
              </div>
            )}

            <div className="min-h-[60px] max-h-[120px] overflow-y-auto mb-3">
              {displayText ? (
                <p className="text-sm text-white/80 leading-relaxed">
                  {transcript}
                  {interimTranscript && (
                    <span className="text-white/40 italic"> {interimTranscript}</span>
                  )}
                </p>
              ) : (
                <p className="text-sm text-white/30 italic">{placeholder}</p>
              )}
            </div>

            {error && (
              <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={handleSubmit}
                disabled={!displayText}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  displayText
                    ? "bg-emerald-500 text-white hover:bg-emerald-600"
                    : "bg-white/5 text-white/30 cursor-not-allowed"
                }`}
              >
                Use Text
              </button>
              <button
                onClick={toggleListening}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  isListening
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                }`}
              >
                {isListening ? (
                  <>
                    <Square className="w-3 h-3" />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="w-3 h-3" />
                    Record
                  </>
                )}
              </button>
            </div>

            <div className="mt-2 text-[10px] text-white/30 text-center">
              {isListening 
                ? `Auto-stops after ${silenceTimeoutSeconds}s silence • Stops when you type`
                : "Speak clearly • Continuous recording until you stop"
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact inline version
export function VoiceInputInline({
  onTranscript,
  disabled = false,
  className = "",
  autoStopOnTyping = true,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
  autoStopOnTyping?: boolean;
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const userStoppedRef = useRef(false);
  const isListeningRef = useRef(false);
  const transcriptRef = useRef("");

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Auto-stop when user starts typing
  useEffect(() => {
    if (!autoStopOnTyping || !isListening) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.isContentEditable;
      
      if (isInputField && isListeningRef.current) {
        stopRecording();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [autoStopOnTyping, isListening]);

  const initRecognition = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;

    const recognition = new SpeechRecognitionAPI();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      transcriptRef.current = "";
      userStoppedRef.current = false;
    };

    recognition.onend = () => {
      if (userStoppedRef.current || !isListeningRef.current) {
        setIsListening(false);
        isListeningRef.current = false;
        if (transcriptRef.current.trim()) {
          onTranscript(transcriptRef.current.trim());
        }
      } else {
        try {
          setTimeout(() => {
            if (isListeningRef.current && recognitionRef.current) {
              recognitionRef.current.start();
            }
          }, 100);
        } catch (e) {
          setIsListening(false);
          isListeningRef.current = false;
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        return;
      }
      
      setIsListening(false);
      isListeningRef.current = false;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let fullTranscript = "";
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          fullTranscript += event.results[i][0].transcript + " ";
        }
      }
      transcriptRef.current = fullTranscript.trim();
    };

    return recognition;
  }, [onTranscript]);

  const startRecording = useCallback(() => {
    if (!isSupported || disabled) return;
    
    userStoppedRef.current = false;
    const recognition = initRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (e) {
        // Ignore
      }
    }
  }, [isSupported, disabled, initRecognition]);

  const stopRecording = useCallback(() => {
    userStoppedRef.current = true;
    isListeningRef.current = false;
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    setIsListening(false);
  }, []);

  const toggle = () => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      className={`p-1.5 rounded-lg transition-all ${
        isListening
          ? "bg-red-500/20 text-red-400"
          : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      title={isListening ? "Recording (stops on typing)" : "Voice input"}
    >
      {isListening ? (
        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.5 }}>
          <Mic className="w-4 h-4" />
        </motion.div>
      ) : (
        <Mic className="w-4 h-4" />
      )}
    </button>
  );
}
