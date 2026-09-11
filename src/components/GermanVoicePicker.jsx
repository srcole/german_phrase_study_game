import React from 'react';
import { germanVoiceKey } from '../lib/germanVoice.js';

export function GermanVoicePicker({ speech, id }) {
  const { supported, voices, preferredVoice, selectedVoice, chooseVoice } = speech;
  if (!supported) return null;
  return <div className="voice-picker">
    <label htmlFor={id}>German voice</label>
    <select id={id} value={preferredVoice} onChange={event => chooseVoice(event.target.value)} aria-describedby={`${id}-help`}>
      <option value="">Automatic{voices[0] ? ` — ${voices[0].name} (${voices[0].lang})` : ' — waiting for German voices'}</option>
      {preferredVoice && !selectedVoice && <option value={preferredVoice}>Saved voice (unavailable)</option>}
      {voices.map(voice => <option key={germanVoiceKey(voice)} value={germanVoiceKey(voice)}>{voice.name} ({voice.lang})</option>)}
    </select>
    <p id={`${id}-help`} className="muted">Choose a voice, then press Play or Replay. Available voices depend on this browser and device.</p>
  </div>;
}
