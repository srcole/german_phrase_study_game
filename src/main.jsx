import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase, configurationError } from './lib/supabase';
import { vocabulary, vocabularyById } from './data/vocabulary';
import { calculateProgress, compareAnswer, formatDuration, normalizeDirection, quizText, scoreQuiz, selectQuestions } from './lib/quiz';
import { loadHistory, saveQuiz } from './lib/history';
import { useGermanSpeech } from './lib/useGermanSpeech';
import { germanVoiceKey } from './lib/germanVoice.js';
import './style.css';

function Notice({ children, error = false }) { return <p role={error ? 'alert' : 'status'} className={error ? 'notice error' : 'notice'}>{children}</p>; }
function Auth() {
  const [mode, setMode] = useState('login');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage(''); setError('');
    const form = new FormData(event.currentTarget);
    const credentials = { email: form.get('email').trim(), password: form.get('password') };
    try {
      const result = mode === 'login' ? await supabase.auth.signInWithPassword(credentials) : await supabase.auth.signUp({ ...credentials, options: { emailRedirectTo: window.location.origin } });
      if (result.error) throw result.error;
      if (mode === 'signup' && !result.data.session) setMessage('Check your email for a confirmation link, then return here to log in. If you already have an account, try logging in.');
    } catch (err) { setError(err.message || 'Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  }
  return <div className="auth-layout"><section><span className="eyebrow">A LITTLE GERMAN, EVERY DAY</span><h1>Your next word.<br/>Your next adventure.</h1><p className="intro">Build confidence in everyday German, ten questions at a time.</p><div className="word-card"><span>YOUR FIRST WORD</span><strong lang="de">Hallo!</strong><p>Hello! A good place to start.</p></div><p className="muted">{vocabulary.length} essentials · Honest self-grading · Progress that stays with you</p></section><section className="card auth-card"><h2>{mode === 'login' ? 'Willkommen zurück.' : 'Start your word journey.'}</h2><p>{mode === 'login' ? 'Log in to practice and see your progress.' : 'Create a free account to save your quizzes.'}</p><form onSubmit={submit}><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required disabled={busy}/><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={mode === 'signup' ? 8 : undefined} required disabled={busy}/>{mode === 'signup' && <small>Use at least 8 characters.</small>}<button className="primary wide" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in →' : 'Create account →'}</button></form>{error && <Notice error>{error}</Notice>}{message && <Notice>{message}</Notice>}<button className="text-button" disabled={busy} onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setMessage(''); }}>{mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}</button></section></div>;
}
function Quiz({ userId, direction, onDirectionChange, settingsError, onSaved }) {
  const { speak, stop, supported: audioSupported, audioError, voices, preferredVoice, chooseVoice, selectedVoice } = useGermanSpeech();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [input, setInput] = useState('');
  const [graded, setGraded] = useState(null);
  const [finished, setFinished] = useState(null);
  const [saveState, setSaveState] = useState('');
  const [error, setError] = useState('');
  const [discarded, setDiscarded] = useState(false);
  const saveLock = useRef(false);
  const inputRef = useRef(null);
  useEffect(() => { if (quiz && !graded && !finished) inputRef.current?.focus(); }, [quiz, answers.length, graded, finished]);
  useEffect(() => {
    if (!quiz || saveState === 'saved') return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [quiz, saveState]);
  function start() { setDiscarded(false); setQuiz({ direction, id: crypto.randomUUID(), startedAt: new Date().toISOString(), questions: selectQuestions(vocabulary) }); setAnswers([]); setInput(''); setGraded(null); setFinished(null); setSaveState(''); setError(''); }
  function endQuiz() {
    // Unfinished quizzes exist only in memory; never call persist here.
    stop();
    setQuiz(null);
    setAnswers([]);
    setInput('');
    setGraded(null);
    setFinished(null);
    setSaveState('');
    setError('');
    setDiscarded(true);
  }
  async function persist(result) {
    if (saveLock.current) return;
    saveLock.current = true; setSaveState('saving'); setError('');
    try { await saveQuiz(result.session, result.answers); setSaveState('saved'); onSaved(); }
    catch (err) { setSaveState('failed'); setError(`Your result could not be fully saved: ${err.message}. Keep this page open and retry.`); }
    finally { saveLock.current = false; }
  }
  function next() {
    stop();
    const nextAnswers = [...answers, graded]; setAnswers(nextAnswers); setGraded(null); setInput('');
    if (nextAnswers.length === 10) {
      const completedAt = new Date().toISOString();
      const score = scoreQuiz(nextAnswers);
      const result = { session: { id: quiz.id, user_id: userId, direction: quiz.direction, started_at: quiz.startedAt, completed_at: completedAt, correct_count: score.correct, total_count: 10, duration_seconds: Math.max(0, Math.round((Date.parse(completedAt) - Date.parse(quiz.startedAt)) / 1000)) }, answers: nextAnswers.map(({ autoCorrect, ...answer }) => answer) };
      setFinished(result); void persist(result);
    }
  }
  if (!quiz) return <>{discarded && <Notice>Quiz ended. No results were saved.</Notice>}<div className="page-heading"><span className="eyebrow">DAILY PRACTICE</span><h1>Small steps. Real progress.</h1><p>Take a moment to make a little more German your own.</p></div><section className="card quiz-intro"><div className="badge" lang="de">Los geht’s!</div><h2>Everyday German</h2><p>Greetings, café orders, getting around, and the words in between.</p><div className="pills"><span>10 questions</span><span>{quizText({}, direction).label}</span><span>At your pace</span></div><div className="settings"><label htmlFor="quiz-direction">Quiz direction</label><select id="quiz-direction" value={direction} onChange={event => onDirectionChange(event.target.value)} aria-describedby="direction-help"><option value="de-en">Show German → guess English</option><option value="en-de">Show English → guess German</option></select><p id="direction-help" className="muted">Applies to the next quiz you start. Remembered for your account on this browser.</p>{settingsError && <Notice error>{settingsError}</Notice>}</div><button className="primary" onClick={start}>Start a quiz →</button><p className="muted">See the answer, check your understanding, and adjust the grade if needed.</p></section><div className="tip"><strong>A little tip</strong><p>{direction === 'en-de' ? 'For German nouns, include the article (der, die, das). Use the infinitive for verbs, as in “essen”.' : 'For English nouns, translate the word without “the”. For verbs, use “to”, as in “to eat”.'} Natural alternatives can be marked correct after submitting.</p></div></>;
  if (finished) {
    const score = scoreQuiz(answers);
    return <><div className="page-heading"><span className="eyebrow">PRACTICE COMPLETE</span><h1>One step further.</h1><p>Every answer is a chance to learn.</p></div><section className="card"><div className="result-score">{score.correct}<span> / 10</span></div><h2>{score.percentage}% correct</h2><p>{score.correct} correct · {score.incorrect} incorrect · {formatDuration(finished.session.duration_seconds)}</p>{saveState === 'saving' && <Notice>Saving your quiz…</Notice>}{saveState === 'saved' && <Notice>Your quiz is saved. Find it in History.</Notice>}{error && <Notice error>{error}</Notice>}{saveState === 'failed' && <button onClick={() => persist(finished)}>Retry saving</button>}<h3>Words to revisit</h3>{!score.incorrect ? <p>You got every word right. Schön gemacht!</p> : <ul className="missed">{answers.filter(a => !a.correct).map(a => <li key={a.id}><strong lang="de">{vocabularyById[a.vocabulary_id].german}</strong><span>{vocabularyById[a.vocabulary_id].english}</span></li>)}</ul>}<button className="primary" disabled={saveState !== 'saved'} onClick={start}>Start another quiz →</button></section></>;
  }
  const item = quiz.questions[answers.length];
  const text = quizText(item, quiz.direction);
  return <><div className="page-heading"><span className="eyebrow">EVERYDAY GERMAN</span><h1>A word at a time.</h1></div><section className="card question-card"><div className="question-meta"><span>Question {answers.length + 1} of 10</span><span>{text.label}</span></div><progress value={answers.length} max="10" aria-label="Quiz progress"/><p className="muted">How would you say this in {text.answerLanguage}?</p><h2 className="german" lang={text.promptLang}>{text.prompt}</h2><form onSubmit={event => { event.preventDefault(); if (!input.trim() || graded) return; const correct = compareAnswer(input, text.expected); setGraded({ id: crypto.randomUUID(), session_id: quiz.id, user_id: userId, vocabulary_id: item.id, user_answer: input.trim(), correct, autoCorrect: correct, answered_at: new Date().toISOString() }); speak(item.german); }}><label htmlFor="answer">Your {text.answerLanguage} translation</label><input ref={inputRef} id="answer" lang={text.answerLang} value={input} onChange={event => setInput(event.target.value)} maxLength={500} disabled={!!graded} autoComplete="off" placeholder="Type your answer…"/>{!graded && <button className="primary" disabled={!input.trim()}>Submit answer →</button>}</form>{graded && <div className="feedback" aria-live="polite"><span className="eyebrow">{graded.autoCorrect ? 'AUTOMATIC MATCH' : 'NO AUTOMATIC MATCH'}</span><h3 lang={text.answerLang}>{text.expected}</h3>{audioSupported && <div className="voice-picker"><label htmlFor="german-voice">German voice</label><select id="german-voice" value={preferredVoice} onChange={event => chooseVoice(event.target.value)} aria-describedby="voice-help"><option value="">Automatic{voices[0] ? ` — ${voices[0].name} (${voices[0].lang})` : ' — waiting for German voices'}</option>{preferredVoice && !selectedVoice && <option value={preferredVoice}>Saved voice (unavailable)</option>}{voices.map(voice => <option key={germanVoiceKey(voice)} value={germanVoiceKey(voice)}>{voice.name} ({voice.lang})</option>)}</select><p id="voice-help" className="muted">Choose a voice, then press Replay. Available voices depend on this browser and device.</p></div>}<div className="button-row"><button type="button" disabled={!audioSupported} onClick={() => speak(item.german)}>Replay German audio</button></div>{!audioSupported && <p className="muted" role="status">Audio is not supported in this browser. Try a browser with speech synthesis support.</p>}{audioError && <Notice error>{audioError}</Notice>}{item.exampleGerman && <p><span lang="de">{item.exampleGerman}</span><br/><span className="muted">{item.exampleEnglish}</span></p>}<p>Current grade: <strong>{graded.correct ? 'Correct' : 'Incorrect'}</strong></p><div className="button-row"><button aria-pressed={graded.correct} onClick={() => setGraded({ ...graded, correct: true })}>Mark correct</button><button aria-pressed={!graded.correct} onClick={() => setGraded({ ...graded, correct: false })}>Mark incorrect</button></div><button className="primary" onClick={next}>{answers.length === 9 ? 'Finish quiz →' : 'Next question →'}</button></div>}<div className="quiz-exit"><button type="button" onClick={endQuiz}>End quiz</button><small>Ends this quiz without saving any results.</small></div></section></>;
}
function History({ sessions, answers }) {
  return <><div className="page-heading"><span className="eyebrow">YOUR PRACTICE JOURNAL</span><h1>Look how far you’ve come.</h1><p>Every completed quiz, all in one place.</p></div>{!sessions.length ? <Empty/> : sessions.map(session => {
    const directionText = quizText({}, session.direction);
    const rows = answers.filter(a => a.session_id === session.id).sort((a, b) => a.answered_at.localeCompare(b.answered_at));
    return <details className="card history-item" key={session.id}><summary><span>{new Date(session.completed_at).toLocaleString()}</span><strong>{session.correct_count}/{session.total_count} · {Math.round(session.correct_count / session.total_count * 100)}%</strong><span>{directionText.label}</span><span>{formatDuration(session.duration_seconds)}</span></summary>{rows.length !== session.total_count && <Notice error>Answer details are incomplete. If the original quiz is still open, use Retry saving there.</Notice>}<div className="table-scroll"><table><thead><tr><th>Prompt</th><th>Your answer</th><th>Expected</th><th>Result</th></tr></thead><tbody>{rows.map(a => <tr key={a.id}><td lang={directionText.promptLang}>{quizText(vocabularyById[a.vocabulary_id] || {}, session.direction).prompt || a.vocabulary_id}</td><td lang={directionText.answerLang}>{a.user_answer}</td><td lang={directionText.answerLang}>{quizText(vocabularyById[a.vocabulary_id] || {}, session.direction).expected || 'Vocabulary unavailable'}</td><td className={a.correct ? 'correct' : 'incorrect'}>{a.correct ? 'Correct' : 'Incorrect'}</td></tr>)}</tbody></table></div></details>;
  })}</>;
}
function Empty() { return <section className="card"><h2>Your journey starts here.</h2><p>Complete your first quiz to see your history and progress.</p><a className="button primary" href="#quiz">Go to quiz →</a></section>; }
function Progress({ sessions, answers }) {
  const [sort, setSort] = useState('accuracy');
  const stats = calculateProgress(sessions, answers);
  const rows = [...stats.rows].sort((a, b) => sort === 'accuracy' ? a.accuracy - b.accuracy || b.attempts - a.attempts : (vocabularyById[a.id]?.german || a.id).localeCompare(vocabularyById[b.id]?.german || b.id, 'de'));
  return <><div className="page-heading"><span className="eyebrow">THE BIGGER PICTURE</span><h1>Watch your German grow.</h1><p>A little repetition goes a long way.</p></div>{!sessions.length ? <Empty/> : <><div className="stats">{[['Quizzes completed', stats.quizzes], ['Questions answered', stats.questions], ['Overall accuracy', `${stats.accuracy}%`], ['Average quiz score', `${stats.averageScore.toFixed(1)}%`]].map(([label, value]) => <div className="card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>{sessions.some(s => answers.filter(a => a.session_id === s.id).length !== s.total_count) && <Notice error>Some answer details are missing. Question statistics reflect only saved answers.</Notice>}<section className="card"><div className="table-heading"><h2>Your vocabulary</h2><label>Sort by <select value={sort} onChange={e => setSort(e.target.value)}><option value="accuracy">Lowest accuracy</option><option value="german">German A–Z</option></select></label></div><div className="table-scroll"><table><thead><tr><th>German</th><th>English</th><th>Attempts</th><th>Correct</th><th>Incorrect</th><th>Accuracy</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td lang="de">{vocabularyById[row.id]?.german || row.id}</td><td>{vocabularyById[row.id]?.english || 'Unavailable'}</td><td>{row.attempts}</td><td>{row.correct}</td><td>{row.incorrect}</td><td>{Math.round(row.accuracy)}%</td></tr>)}</tbody></table></div></section></>}</>;
}
function Workspace({ session }) {
  const getPage = () => ['quiz', 'history', 'progress', 'account'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'quiz';
  const [page, setPage] = useState(getPage);
  const preferenceKey = `wortreise:direction:${session.user.id}`;
  const [direction, setDirection] = useState(() => {
    try { return normalizeDirection(localStorage.getItem(preferenceKey)); }
    catch { return normalizeDirection(); }
  });
  const [settingsError, setSettingsError] = useState('');
  function changeDirection(value) {
    const nextDirection = normalizeDirection(value);
    setDirection(nextDirection);
    setSettingsError('');
    try { localStorage.setItem(preferenceKey, nextDirection); }
    catch { setSettingsError('Your choice applies now, but this browser could not remember it for your next visit.'); }
  }
  const [history, setHistory] = useState({ sessions: [], answers: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  useEffect(() => { const change = () => setPage(getPage()); window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change); }, []);
  useEffect(() => { let active = true; setLoading(true); setError(''); loadHistory(session.user.id).then(data => { if (active) setHistory(data); }).catch(err => { if (active) setError(err.message); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [session.user.id, revision, page]);
  async function logout() { setLoggingOut(true); setError(''); try { const { error } = await supabase.auth.signOut({ scope: 'local' }); if (error) throw error; } catch (err) { setError(err.message); } finally { setLoggingOut(false); } }
  return <><header><a className="brand" href="#quiz"><span className="brand-icon">w.</span>wortreise<span className="brand-caption">GERMAN, LITTLE BY LITTLE</span></a><nav aria-label="Main navigation">{['quiz', 'history', 'progress', 'account'].map(name => <a key={name} href={`#${name}`} aria-current={page === name ? 'page' : undefined}>{name[0].toUpperCase() + name.slice(1)}</a>)}</nav></header><main>{/* Keep an active quiz mounted when visiting other tabs. */}<div hidden={page !== 'quiz'}><Quiz userId={session.user.id} direction={direction} onDirectionChange={changeDirection} settingsError={settingsError} onSaved={() => setRevision(r => r + 1)}/></div>{(page === 'history' || page === 'progress') && (loading ? <Notice>Loading your practice history…</Notice> : error ? <><Notice error>{error}</Notice><button onClick={() => setRevision(r => r + 1)}>Try again</button></> : page === 'history' ? <History {...history}/> : <Progress {...history}/>)}{page === 'account' && <section className="card account"><span className="eyebrow">YOUR ACCOUNT</span><h1>A place for your progress.</h1><p>Logged in as <strong>{session.user.email}</strong></p><p className="muted">Finished quizzes sync to your account. Finish and save your current quiz before logging out.</p>{error && <Notice error>{error}</Notice>}<button disabled={loggingOut} onClick={logout}>{loggingOut ? 'Logging out…' : 'Log out'}</button></section>}</main><footer>A few words today. A little more confidence tomorrow.</footer></>;
}
function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    let authChanged = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => { authChanged = true; if (active) { setSession(next); setLoading(false); setError(''); } });
    supabase.auth.getSession().then(({ data, error }) => { if (!active || authChanged) return; if (error) setError(error.message); else setSession(data.session); setLoading(false); }).catch(err => { if (active) { setError(err.message); setLoading(false); } });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  if (configurationError) return <main><h1>Welcome to Wortreise.</h1><Notice>{configurationError}</Notice><p>Follow the setup instructions in README.md to connect Supabase.</p></main>;
  if (loading) return <main><Notice>Loading your account…</Notice></main>;
  if (session) return <Workspace key={session.user.id} session={session}/>;
  return <><header><a className="brand" href="#quiz"><span className="brand-icon">w.</span>wortreise</a><span className="muted">Your everyday German companion</span></header><main>{error && <Notice error>{error}</Notice>}<Auth/></main></>;
}
createRoot(document.getElementById('root')).render(<App/>);
