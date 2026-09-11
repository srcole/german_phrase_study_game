import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnswer, compareAnswer, selectQuestions, scoreQuiz, calculateProgress } from '../src/lib/quiz.js';
import { vocabulary } from '../src/data/vocabulary.js';
test('normalizes case, whitespace, punctuation and apostrophes', () => {
  assert.equal(normalizeAnswer('  HELLO,   world! '), 'hello world');
  assert.ok(compareAnswer('What time is it', 'What time is it?'));
  assert.ok(compareAnswer('I’m here.', "I'm here"));
});
test('does not accept empty, partial, misspelled or substantially wrong answers', () => {
  for (const answer of ['', '!!!', 'watermelon', 'watre', 'no water']) assert.equal(compareAnswer(answer, 'water'), false);
  assert.equal(compareAnswer('I understand', 'I do not understand'), false);
  assert.equal(compareAnswer('to go', 'to eat'), false);
});
test('quiz selection is unique and does not mutate vocabulary', () => {
  const original = [...vocabulary]; const selected = selectQuestions(vocabulary);
  assert.equal(selected.length, 10); assert.equal(new Set(selected.map(x => x.id)).size, 10);
  assert.deepEqual(vocabulary, original); assert.equal(new Set(vocabulary.map(v => v.id)).size, vocabulary.length);
});
test('scoring uses final manual grade', () => {
  assert.deepEqual(scoreQuiz([{ correct: true, autoCorrect: false }, { correct: false, autoCorrect: true }, { correct: true }]), { correct: 2, incorrect: 1, total: 3, percentage: 67 });
  assert.deepEqual(scoreQuiz([]), { correct: 0, incorrect: 0, total: 0, percentage: 0 });
});
test('progress aggregates repeated attempts and averages quiz percentages', () => {
  const result = calculateProgress([{ correct_count: 7, total_count: 10 }, { correct_count: 9, total_count: 10 }], [{ vocabulary_id: 'hallo', correct: true }, { vocabulary_id: 'hallo', correct: false }, { vocabulary_id: 'brot', correct: true }]);
  assert.equal(result.quizzes, 2); assert.equal(result.questions, 3); assert.equal(result.accuracy, 67); assert.equal(result.averageScore, 80);
  assert.deepEqual(result.rows.find(r => r.id === 'hallo'), { id: 'hallo', attempts: 2, correct: 1, incorrect: 1, accuracy: 50 });
});
test('empty progress contains no NaN or invented attempts', () => {
  assert.deepEqual(calculateProgress([], []), { quizzes: 0, questions: 0, accuracy: 0, averageScore: 0, rows: [] });
});

test('quiz direction uses the opposite language as the expected answer', async () => {
  const { quizText } = await import('../src/lib/quiz.js');
  const item = { german: 'das Wasser', english: 'water' };
  const forward = quizText(item, 'de-en');
  const reverse = quizText(item, 'en-de');
  assert.equal(forward.prompt, 'das Wasser');
  assert.equal(forward.expected, 'water');
  assert.equal(forward.promptLang, 'de');
  assert.equal(reverse.prompt, 'water');
  assert.equal(reverse.expected, 'das Wasser');
  assert.equal(reverse.answerLang, 'de');
  assert.ok(compareAnswer('  DAS WASSER! ', reverse.expected));
  assert.equal(compareAnswer('water', reverse.expected), false);
});

test('old history and invalid preferences default to German-to-English', async () => {
  const { normalizeDirection, quizText } = await import('../src/lib/quiz.js');
  const item = { german: 'groß', english: 'big' };
  for (const direction of [undefined, null, '', 'invalid', 'de-en']) {
    assert.equal(normalizeDirection(direction), 'de-en');
    assert.equal(quizText(item, direction).expected, 'big');
  }
  assert.equal(normalizeDirection('en-de'), 'en-de');
});

test('German grading preserves meaningful umlaut differences', () => {
  assert.ok(compareAnswer('SCHLÜSSEL', 'Schlüssel'));
  assert.equal(compareAnswer('schon', 'schön'), false);
});

test('quiz selection supports one question, custom lengths, and all active vocabulary', () => {
  for (const count of [1, 5, 10, 20, vocabulary.length]) {
    const selected = selectQuestions(vocabulary, count);
    assert.equal(selected.length, count);
    assert.equal(new Set(selected.map(item => item.id)).size, count);
  }
  for (const count of [0, -1, 2.5, NaN, Infinity, '5', vocabulary.length + 1]) {
    assert.throws(() => selectQuestions(vocabulary, count), RangeError);
  }
});

test('scores and progress use actual lengths for mixed-length quizzes', () => {
  assert.deepEqual(scoreQuiz([{ correct: true }]), { correct: 1, incorrect: 0, total: 1, percentage: 100 });
  const answers = Array.from({ length: 5 }, (_, index) => ({ vocabulary_id: 'gut', correct: index < 3 }));
  assert.equal(scoreQuiz(answers).percentage, 60);
  const stats = calculateProgress([
    { correct_count: 1, total_count: 1 },
    { correct_count: 3, total_count: 5 },
  ], [{ vocabulary_id: 'gut', correct: true }, ...answers]);
  assert.equal(stats.questions, 6);
  assert.equal(stats.accuracy, 67);
  assert.equal(stats.averageScore, 80);
});
