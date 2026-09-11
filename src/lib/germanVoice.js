export function germanVoiceKey(voice) {
  return JSON.stringify([voice.voiceURI || '', voice.lang, voice.name || '']);
}

export function listGermanVoices(voices) {
  return voices.filter(voice => /^de(?:[-_]|$)/i.test(voice.lang)).sort((a, b) => {
    const googleDeutsch = voice => /^google deutsch$/i.test((voice.name || '').trim()) ? 0 : 1;
    const germany = voice => /^de[-_]DE$/i.test(voice.lang) ? 0 : 1;
    return googleDeutsch(a) - googleDeutsch(b)
      || germany(a) - germany(b)
      || germanVoiceKey(a).localeCompare(germanVoiceKey(b), 'en');
  });
}

// Resolve the actual voice object from the current browser list every time.
// Never substitute another voice if the user explicitly selected one.
export function selectGermanVoice(voices, preferredKey = '') {
  const german = listGermanVoices(voices);
  return (preferredKey
    ? german.find(voice => germanVoiceKey(voice) === preferredKey)
    : german[0]) || null;
}
