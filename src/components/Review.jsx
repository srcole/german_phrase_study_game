import React, { useState } from 'react';
import { vocabulary, vocabularyCategories } from '../data/vocabulary.js';
import { GermanVoicePicker } from './GermanVoicePicker.jsx';

export function Review({ speech }) {
  const [category, setCategory] = useState('numbers');
  const [playingIds, setPlayingIds] = useState([]);
  const items = vocabulary.filter(item => item.category === category);
  const { speak, stop, supported, audioError, speakingIndex } = speech;
  const currentId = speakingIndex !== null && speakingIndex >= 0 ? playingIds[speakingIndex] : null;
  const currentItem = items.find(item => item.id === currentId);

  function play(entries) {
    setPlayingIds(entries.map(item => item.id));
    speak(entries.map(item => item.german));
  }

  return <>
    <div className="page-heading">
      <span className="eyebrow">LISTEN & LEARN</span>
      <h1>A little time with your words.</h1>
      <p>Choose a category, read the translations, and listen to the German pronunciation.</p>
    </div>
    <section className="card">
      <label htmlFor="review-category">Vocabulary category</label>
      <select id="review-category" value={category} onChange={event => {
        stop(); setPlayingIds([]); setCategory(event.target.value);
      }}>
        {vocabularyCategories.map(group => <option key={group.id} value={group.id}>{group.label}</option>)}
      </select>
      <GermanVoicePicker speech={speech} id="review-voice"/>
      <div className="button-row review-controls">
        <button className="primary" disabled={!supported || !items.length} onClick={() => play(items)}>Play all ({items.length})</button>
        <button disabled={speakingIndex === null} onClick={stop}>Stop audio</button>
      </div>
      {!supported && <p role="status" className="notice">Audio is not supported in this browser. You can still review the vocabulary below.</p>}
      {audioError && <p role="alert" className="notice error">{audioError}</p>}
      <p className="muted" role="status">
        {speakingIndex === -1 ? 'Loading German voice…' : currentItem ? <>Playing: <span lang="de">{currentItem.german}</span></> : `${items.length} words and phrases · Review does not affect your quiz history.`}
      </p>
      <details className="pronunciation-guide">
        <summary>How to read pronunciation help</summary>
        <p>These are approximate guides for English speakers. CAPITALS mark stressed syllables; hyphens separate syllables. Listen to the German audio for the actual sounds.</p>
        <ul>
          <li><strong>ey</strong> sounds like “eye”; <strong>ay</strong> like “say” without the ending glide; <strong>ee</strong> like “see”; <strong>oh</strong> like “go” without the ending glide.</li>
          <li><strong>ow</strong> sounds like “cow”; <strong>oy</strong> like “boy”; <strong>oo</strong> like “food” (shorter in words such as Bus).</li>
          <li><strong>ch</strong> is the soft German sound in “ich”: let air pass between the tongue and the roof of the mouth, without a “k” or English “ch”. <strong>kh</strong> is the throat sound in Scottish “loch”.</li>
          <li><strong>ü</strong>: say a short “ih” with rounded lips; <strong>üü</strong>: hold “ee” with rounded lips. <strong>ts</strong> sounds like the end of “cats”; <strong>sh</strong> like “ship”.</li>
        </ul>
      </details>
      <div className="table-scroll" role="region" aria-label="Review vocabulary" tabIndex={0}>
        <table className="review-table">
          <thead><tr><th scope="col">German</th><th scope="col">English</th><th scope="col">Pronunciation help</th><th scope="col">Audio</th></tr></thead>
          <tbody>{items.map(item => <tr key={item.id} className={item.id === currentId ? 'is-playing' : ''}>
            <td lang="de"><strong>{item.german}</strong></td>
            <td>{item.english}</td>
            <td className="pronunciation-help">{item.pronunciationHelp}</td>
            <td><button disabled={!supported} onClick={() => play([item])} aria-label={`Play German pronunciation: ${item.german}`}>Play</button></td>
          </tr>)}</tbody>
        </table>
      </div>
    </section>
  </>;
}
