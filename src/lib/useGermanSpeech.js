import { useEffect, useRef, useState } from 'react';
import { listGermanVoices, selectGermanVoice } from './germanVoice.js';
import { playSpeechSequence } from './speechSequence.js';

const preferenceKey = 'wortreise:german-voice';

export function useGermanSpeech() {
  const supported = typeof window !== 'undefined'
    && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const playbackRef = useRef(null);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const pendingRef = useRef(null);
  const [audioError, setAudioError] = useState('');
  const [voices, setVoices] = useState([]);
  const [preferredVoice, setPreferredVoice] = useState(() => {
    try { return localStorage.getItem(preferenceKey) || ''; }
    catch { return ''; }
  });
  const preferredRef = useRef(preferredVoice);

  function stop() {
    if (pendingRef.current) {
      pendingRef.current();
      pendingRef.current = null;
    }
    if (playbackRef.current) {
      playbackRef.current();
      playbackRef.current = null;
    }
    setSpeakingIndex(null);
  }

  useEffect(() => {
    if (!supported) return;
    // Some browsers load their voice list asynchronously on first access.
    const updateVoices = () => setVoices(listGermanVoices(window.speechSynthesis.getVoices()));
    updateVoices();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
    window.addEventListener('hashchange', stop);
    return () => {
      window.removeEventListener('hashchange', stop);
      window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
      stop();
    };
  }, [supported]);

  function chooseVoice(key) {
    stop();
    preferredRef.current = key;
    setPreferredVoice(key);
    setAudioError('');
    try { localStorage.setItem(preferenceKey, key); }
    catch { /* Selection still works for the current visit. */ }
  }

  function speak(german, waitForVoices = true) {
    if (!supported) return;
    stop();
    setAudioError('');
    const texts = Array.isArray(german) ? german : [german];
    if (!texts.length) return;
    setSpeakingIndex(-1);
    try {
      const voices = window.speechSynthesis.getVoices();
      const voice = selectGermanVoice(voices, preferredRef.current);
      if (!voice) {
        if (waitForVoices) {
          // Voice discovery can finish after the first guess is submitted.
          // Cancel this pending playback on replay, navigation, or logout.
          const onVoicesChanged = () => {
            if (selectGermanVoice(window.speechSynthesis.getVoices(), preferredRef.current)) speak(german, false);
          };
          const timer = window.setTimeout(() => {
            stop();
            setAudioError(preferredRef.current
              ? 'Your selected German voice is unavailable. Choose another German voice or Automatic, then replay.'
              : 'No German voice is available. Install or enable a German (Deutsch) text-to-speech voice in your device settings, then reload this page and try Replay German audio.');
          }, 2000);
          window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
          pendingRef.current = () => {
            window.clearTimeout(timer);
            window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
          };
        } else {
          setSpeakingIndex(null);
          setAudioError('No German voice is available. Enable a German (Deutsch) speech voice on your device and try again.');
        }
        return;
      }
      playbackRef.current = playSpeechSequence(
        window.speechSynthesis, window.SpeechSynthesisUtterance, texts, voice,
        setSpeakingIndex,
        () => setAudioError('Audio could not play. Try playing again or choose another German voice.'),
      );
    } catch {
      stop();
      setAudioError('Audio is unavailable right now. Try Replay German audio or another browser.');
    }
  }

  const selectedVoice = selectGermanVoice(voices, preferredVoice);
  return { speak, stop, supported, audioError, voices, preferredVoice, chooseVoice, selectedVoice, speakingIndex };
}
