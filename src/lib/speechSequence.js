// Speak one entry at a time; retaining each utterance also avoids browser GC issues.
export function playSpeechSequence(synthesis, Utterance, texts, voice, onIndex, onError) {
  let current = null;
  let timer = null;
  let stopped = false;

  function cancel() {
    stopped = true;
    clearTimeout(timer);
    if (current) {
      current.onend = null;
      current.onerror = null;
      current = null;
      synthesis.cancel();
    }
  }

  function play(index) {
    if (stopped) return;
    if (index >= texts.length) { onIndex(null); return; }
    try {
      const utterance = new Utterance(texts[index]);
      current = utterance;
      utterance.lang = voice.lang.replace(/_/g, '-');
      utterance.voice = voice;
      utterance.rate = 0.85;
      utterance.onend = () => {
        if (stopped) return;
        current = null;
        if (index + 1 === texts.length) onIndex(null);
        else timer = setTimeout(() => play(index + 1), 350);
      };
      utterance.onerror = event => {
        if (stopped) return;
        current = null;
        stopped = true;
        onIndex(null);
        if (event.error !== 'canceled' && event.error !== 'interrupted') onError();
      };
      onIndex(index);
      synthesis.speak(utterance);
    } catch {
      cancel();
      onIndex(null);
      onError();
    }
  }
  play(0);
  return cancel;
}
