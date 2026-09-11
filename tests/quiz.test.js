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
