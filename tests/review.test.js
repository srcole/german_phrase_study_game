import test from 'node:test';
import assert from 'node:assert/strict';
import { vocabulary, vocabularyCategories, vocabularyById } from '../src/data/vocabulary.js';
import { playSpeechSequence } from '../src/lib/speechSequence.js';

const pause = () => new Promise(resolve => setTimeout(resolve, 400));
function engine() {
  const utterances = [];
  let cancels = 0;
  return {
    utterances,
    get cancels() { return cancels; },
    synthesis: { speak: utterance => utterances.push(utterance), cancel: () => { cancels++; } },
    Utterance: class { constructor(text) { this.text = text; } },
  };
}
const voice = { lang: 'de-DE', name: 'Google Deutsch' };

test('every active entry has a valid category and retired entries are excluded', () => {
  const categories = new Set(vocabularyCategories.map(category => category.id));
  assert.equal(categories.size, vocabularyCategories.length);
  for (const item of vocabulary) assert.ok(categories.has(item.category), item.id);
  for (const category of categories) assert.ok(vocabulary.some(item => item.category === category));
  assert.equal(vocabulary.filter(item => item.category === 'numbers').length, 20);
  assert.ok(vocabularyById.apfel);
  assert.equal(vocabulary.some(item => item.id === 'apfel'), false);
});

test('play all reads entries in order with the same German voice and finishes', async () => {
  const fake = engine();
  const indices = [];
  playSpeechSequence(fake.synthesis, fake.Utterance, ['eins', 'zwei'], voice, index => indices.push(index), () => assert.fail('Unexpected speech error'));
  assert.equal(fake.utterances[0].text, 'eins');
  assert.equal(fake.utterances[0].voice, voice);
  assert.equal(fake.utterances[0].lang, 'de-DE');
  fake.utterances[0].onend();
  assert.equal(fake.utterances.length, 1);
  await pause();
  assert.equal(fake.utterances[1].text, 'zwei');
  assert.equal(fake.utterances[1].voice, voice);
  fake.utterances[1].onend();
  assert.deepEqual(indices, [0, 1, null]);
});

test('stopping during playback detaches callbacks and cancels speech', async () => {
  const fake = engine();
  const stop = playSpeechSequence(fake.synthesis, fake.Utterance, ['eins', 'zwei'], voice, () => {}, () => {});
  const lateEnd = fake.utterances[0].onend;
  stop();
  assert.equal(fake.cancels, 1);
  assert.equal(fake.utterances[0].onend, null);
  lateEnd();
  await pause();
  assert.equal(fake.utterances.length, 1);
});

test('stopping between entries cancels the next entry', async () => {
  const fake = engine();
  const stop = playSpeechSequence(fake.synthesis, fake.Utterance, ['eins', 'zwei'], voice, () => {}, () => {});
  fake.utterances[0].onend();
  stop();
  await pause();
  assert.equal(fake.utterances.length, 1);
});

test('speech errors end the list and report a failure', () => {
  const fake = engine();
  const indices = [];
  let errors = 0;
  playSpeechSequence(fake.synthesis, fake.Utterance, ['eins', 'zwei'], voice, index => indices.push(index), () => { errors++; });
  fake.utterances[0].onerror({ error: 'network' });
  assert.equal(errors, 1);
  assert.deepEqual(indices, [0, null]);
  assert.equal(fake.utterances.length, 1);
});
