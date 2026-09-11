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
      <ul className="review-list">
        {items.map(item => <li key={item.id} className={item.id === currentId ? 'is-playing' : ''}>
          <div><strong lang="de">{item.german}</strong><span>{item.english}</span></div>
          <button disabled={!supported} onClick={() => play([item])} aria-label={`Play German pronunciation: ${item.german}`}>Play</button>
        </li>)}
      </ul>
    </section>
  </>;
}
