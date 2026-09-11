import { supabase } from './supabase';
// Paginate so statistics do not silently stop at the API's default row limit.
async function allRows(table, userId) {
  const rows = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', userId).order('id').range(from, from + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
}
export async function loadHistory(userId) {
  const [sessions, answers] = await Promise.all([allRows('quiz_sessions', userId), allRows('quiz_answers', userId)]);
  return { sessions: sessions.sort((a, b) => b.completed_at.localeCompare(a.completed_at)), answers };
}
// Stable UUIDs make retries safe, including when a response is lost after a successful insert.
export async function saveQuiz(session, answers) {
  const { data: existing, error: readError } = await supabase.from('quiz_sessions').select('id').eq('id', session.id).maybeSingle();
  if (readError) throw readError;
  if (!existing) {
    const { error } = await supabase.from('quiz_sessions').insert(session);
    if (error) throw error;
  }
  const { data: saved, error: answerReadError } = await supabase.from('quiz_answers').select('id').eq('session_id', session.id);
  if (answerReadError) throw answerReadError;
  const ids = new Set(saved.map(answer => answer.id));
  const missing = answers.filter(answer => !ids.has(answer.id));
  if (missing.length) {
    const { error } = await supabase.from('quiz_answers').insert(missing);
    if (error) throw error;
  }
}
