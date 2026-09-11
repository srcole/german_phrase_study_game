import { useEffect, useRef, useState } from 'react';
import { selectGermanVoice } from './germanVoice.js';

export function useGermanSpeech() {
  const supported = typeof window !== 'undefined'
    && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const utteranceRef = useRef(null);
  const pendingRef = useRef(null);
  const [audioError, setAudioError] = useState('');

  function stop() {
    if (pendingRef.current) {
      pendingRef.current();
      pendingRef.current = null;
    }
    const utterance = utteranceRef.current;
    if (utterance) {
      // Ignore late events from canceled speech when replaying or navigating.
      utterance.onend = null;
      utterance.onerror = null;
      utteranceRef.current = null;
      window.speechSynthesis.cancel();
    }
  }

  useEffect(() => {
    if (!supported) return;
    // Some browsers load their voice list asynchronously on first access.
    window.speechSynthesis.getVoices();
    window.addEventListener('hashchange', stop);
    return () => {
      window.removeEventListener('hashchange', stop);
      stop();
    };
  }, [supported]);

  function speak(german, waitForVoices = true) {
    if (!supported) return;
    stop();
    setAudioError('');
    try {
      const voices = window.speechSynthesis.getVoices();
      const voice = selectGermanVoice(voices);
      if (!voice) {
        if (waitForVoices) {
          // Voice discovery can finish after the first guess is submitted.
          // Cancel this pending playback on replay, navigation, or logout.
          const onVoicesChanged = () => {
            if (selectGermanVoice(window.speechSynthesis.getVoices())) speak(german, false);
          };
          const timer = window.setTimeout(() => {
            stop();
            setAudioError('No German voice is available. Install or enable a German (Deutsch) text-to-speech voice in your device settings, then reload this page and try Replay German audio.');
          }, 2000);
          window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);
          pendingRef.current = () => {
            window.clearTimeout(timer);
            window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
          };
        } else {
          setAudioError('No German voice is available. Enable a German (Deutsch) speech voice on your device and try again.');
        }
        return;
      }
      const utterance = new window.SpeechSynthesisUtterance(german);
      utterance.lang = voice.lang;
      utterance.voice = voice;
      utterance.rate = 0.85;
      // Retain the utterance until playback ends (needed by some browsers).
      utteranceRef.current = utterance;
      utterance.onend = () => { utteranceRef.current = null; };
      utterance.onerror = event => {
        utteranceRef.current = null;
        if (event.error === 'canceled' || event.error === 'interrupted') return;
        setAudioError('Audio could not play. Try Replay German audio. If it still fails, check that your device has a German speech voice enabled.');
      };
      // Submit/Replay normally calls this directly. If delayed voice loading
      // loses user activation, the error message offers an explicit replay.
      window.speechSynthesis.speak(utterance);
    } catch {
      stop();
      setAudioError('Audio is unavailable right now. Try Replay German audio or another browser.');
    }
  }

  return { speak, stop, supported, audioError };
}
