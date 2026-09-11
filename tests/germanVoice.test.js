import test from 'node:test';
import assert from 'node:assert/strict';
import { selectGermanVoice } from '../src/lib/germanVoice.js';

test('Google Deutsch is the automatic first choice, while explicit choices still win', async () => {
  const { germanVoiceKey } = await import('../src/lib/germanVoice.js');
  const anna = { name: 'Anna', lang: 'de-DE', voiceURI: 'anna' };
  const google = { name: 'Google Deutsch', lang: 'de-DE', voiceURI: 'google' };
  assert.equal(selectGermanVoice([anna, google]), google);
  assert.equal(selectGermanVoice([google, anna]), google);
  assert.equal(selectGermanVoice([anna, google], germanVoiceKey(anna)), anna);
  assert.equal(selectGermanVoice([anna]), anna);
  assert.equal(selectGermanVoice([{ ...google, lang: 'en-US' }]), null);
});

test('prefers a German (Germany) voice over an English default or other German locale', () => {
  const english = { lang: 'en-US', default: true };
  const austrian = { lang: 'de-AT' };
  const german = { lang: 'de-DE' };
  assert.equal(selectGermanVoice([english, austrian, german]), german);
});

test('accepts German regional voices and language tag variations', () => {
  for (const lang of ['de', 'de-AT', 'de-CH', 'de_DE', 'DE-de']) {
    const voice = { lang };
    assert.equal(selectGermanVoice([{ lang: 'en-GB' }, voice]), voice);
  }
});

test('never selects a non-German voice or falls back when voices have not loaded', () => {
  assert.equal(selectGermanVoice([]), null);
  assert.equal(selectGermanVoice([
    { lang: 'en-US', default: true, name: 'German sounding name' },
    { lang: 'fr-FR' },
    { lang: 'den' },
  ]), null);
});

test('automatic selection is stable when the browser changes voice order', () => {
  const anna = { name: 'Anna', lang: 'de-DE', voiceURI: 'anna' };
  const petra = { name: 'Petra', lang: 'de-DE', voiceURI: 'petra' };
  assert.equal(selectGermanVoice([petra, anna]), selectGermanVoice([anna, petra]));
});

test('explicit voice choice is honored using the current browser object', async () => {
  const { germanVoiceKey } = await import('../src/lib/germanVoice.js');
  const anna = { name: 'Anna', lang: 'de-DE', voiceURI: 'anna' };
  const petra = { name: 'Petra', lang: 'de-DE', voiceURI: 'petra' };
  const key = germanVoiceKey(petra);
  const reloaded = { ...petra };
  assert.equal(selectGermanVoice([anna, reloaded], key), reloaded);
  assert.equal(selectGermanVoice([anna], key), null);
  const english = { name: 'English', lang: 'en-US', voiceURI: 'english' };
  assert.equal(selectGermanVoice([english, anna], germanVoiceKey(english)), null);
});
