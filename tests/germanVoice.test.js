import test from 'node:test';
import assert from 'node:assert/strict';
import { selectGermanVoice } from '../src/lib/germanVoice.js';

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
