export const DEFAULT_DIRECTION = 'de-en';
export function normalizeDirection(direction) {
  return direction === 'en-de' ? 'en-de' : DEFAULT_DIRECTION;
}
export function quizText(item, direction) {
  const reverse = normalizeDirection(direction) === 'en-de';
  return {
    prompt: reverse ? item.english : item.german,
    expected: reverse ? item.german : item.english,
    promptLang: reverse ? 'en' : 'de',
    answerLang: reverse ? 'de' : 'en',
    answerLanguage: reverse ? 'German' : 'English',
    label: reverse ? 'English → German' : 'German → English',
  };
}

export function normalizeAnswer(answer) {
  return String(answer).normalize('NFKC').toLowerCase().trim()
    .replace(/[’‘]/g, "'").replace(/['.,!?;:„“”"()]/g, '').replace(/\s+/g, ' ');
}
export function compareAnswer(answer, expected) {
  const normalized = normalizeAnswer(answer);
  return normalized.length > 0 && normalized === normalizeAnswer(expected);
}
export function selectQuestions(items, count = 10, random = Math.random) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}
export function scoreQuiz(answers) {
  const correct = answers.filter(answer => answer.correct).length;
  return { correct, incorrect: answers.length - correct, total: answers.length, percentage: answers.length ? Math.round(correct / answers.length * 100) : 0 };
}
export function calculateProgress(sessions, answers) {
  const rows = new Map();
  for (const answer of answers) {
    const row = rows.get(answer.vocabulary_id) || { id: answer.vocabulary_id, attempts: 0, correct: 0, incorrect: 0 };
    row.attempts++;
    answer.correct ? row.correct++ : row.incorrect++;
    row.accuracy = row.correct / row.attempts * 100;
    rows.set(row.id, row);
  }
  return { quizzes: sessions.length, questions: answers.length, accuracy: scoreQuiz(answers).percentage,
    averageScore: sessions.length ? sessions.reduce((sum, session) => sum + session.correct_count / session.total_count * 100, 0) / sessions.length : 0,
    rows: [...rows.values()] };
}
export function formatDuration(seconds) {
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
