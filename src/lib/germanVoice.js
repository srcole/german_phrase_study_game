// Never fall back to the device's default voice: it may speak English.
export function selectGermanVoice(voices) {
  return voices.find(voice => /^de[-_]DE$/i.test(voice.lang))
    || voices.find(voice => /^de(?:[-_]|$)/i.test(voice.lang))
    || null;
}
