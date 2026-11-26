"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** The browser's built-in speech recognition (Chrome, Edge, Safari). Not in the standard typings. */
type SpeechResult = { isFinal: boolean; 0: { transcript: string } };
type SpeechEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionConstructor = new () => Recognition;

function getConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERRORS: Record<string, string> = {
  "not-allowed": "The microphone is blocked. Allow it from the lock icon in the address bar, then try again.",
  "service-not-allowed": "The microphone is blocked. Allow it from the lock icon in the address bar, then try again.",
  "no-speech": "I did not hear anything. Try again a little closer to the microphone.",
  "audio-capture": "No microphone was found.",
};

/**
 * Speak instead of typing. Each finished phrase is passed to onText.
 * `supported` is false on the server and in browsers without speech recognition,
 * so the button can hide itself.
 */
export function useSpeech(onText: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recognition = useRef<Recognition | null>(null);
  const handler = useRef(onText);
  handler.current = onText;

  useEffect(() => {
    setSupported(getConstructor() !== null);
    return () => recognition.current?.stop();
  }, []);

  const toggle = useCallback(() => {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const Ctor = getConstructor();
    if (!Ctor) return;
    setError("");
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) handler.current(result[0].transcript);
      }
    };
    rec.onerror = (event) => setError(ERRORS[event.error ?? ""] ?? "Voice input stopped. You can type instead.");
    rec.onend = () => setListening(false);
    recognition.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("Voice input could not start. You can type instead.");
    }
  }, [listening]);

  return { supported, listening, error, toggle };
}

/** Add a spoken phrase to the end of what is already typed. */
export function appendSpoken(current: string, spoken: string, max = 4000): string {
  const text = spoken.trim();
  if (!text) return current;
  const joined = current.trim() ? `${current.trimEnd()} ${text}` : text;
  return joined.slice(0, max);
}
