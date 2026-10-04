import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { QUESTIONS } from '../constants/questions.js';
import { HINDI_DEFINITIONS } from '../constants/questionsHi.js';
import WordTooltip from '../components/WordTooltip.jsx';

const ROWS_PER_PAGE = 8;
const TOTAL_PAGES   = 3;

export default function Assessment() {
  const { token }  = useParams();
  const navigate   = useNavigate();
  const user       = JSON.parse(localStorage.getItem('ksb_user') || '{}');

  const [meta, setMeta]         = useState(null);
  const [error, setError]       = useState('');
  const [hindi, setHindi]       = useState(false);
  const [page, setPage]         = useState(0);
  const [selections, setSelections] = useState(
    Object.fromEntries(Array.from({ length: 24 }, (_, i) => [i, { most: null, least: null }]))
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/assess/${token}`)
      .then((res) => setMeta(res.data))
      .catch((err) => {
        if (err.response?.status === 410) {
          setError('This assessment has already been submitted.');
        } else {
          setError(err.response?.data?.error || 'Assessment not found.');
        }
      });
  }, [token]);

  function getDefinition(word) {
    if (hindi) return HINDI_DEFINITIONS[word] || '';
    for (const q of QUESTIONS) {
      const w = q.words.find((w) => w.word === word);
      if (w) return w.definition;
    }
    return '';
  }

  function handleSelect(qIndex, type, dim) {
    setSelections((prev) => {
      const cur = { ...prev[qIndex] };
      cur[type] = dim;
      if (type === 'most'  && cur.least === dim) cur.least = null;
      if (type === 'least' && cur.most  === dim) cur.most  = null;
      return { ...prev, [qIndex]: cur };
    });
  }

  const pageStart    = page * ROWS_PER_PAGE;
  const pageQs       = QUESTIONS.slice(pageStart, pageStart + ROWS_PER_PAGE);
  const pageComplete = pageQs.every((q) => {
    const s = selections[q.index];
    return s.most !== null && s.least !== null;
  });
  const answeredCount = QUESTIONS.filter((q) => {
    const s = selections[q.index];
    return s.most !== null && s.least !== null;
  }).length;
  const allComplete = answeredCount === 24;

  async function handleSubmit() {
    setSubmitting(true);
    const responses = QUESTIONS.map((q) => ({
      question_index: q.index,
      most_dim:  selections[q.index].most,
      least_dim: selections[q.index].least,
    }));
    try {
      const { data } = await api.post(`/assess/${token}/submit`, { responses });
      navigate(`/assess/${token}/done`, { state: { assessmentId: data.assessmentId } });
    } catch (err) {
      alert(err.response?.data?.error || 'Submission failed. Please try again.');
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f3f8' }}>
        <div style={{ textAlign: 'center', padding: 40, color: '#c0392b', fontSize: 16 }}>{error}</div>
      </div>
    );
  }
  if (!meta) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f3f8' }}>
        <div style={{ color: '#888', fontSize: 15 }}>Loading…</div>
      </div>
    );
  }

  const progressPct = Math.round((answeredCount / 24) * 100);

  return (
    <div style={{ minHeight: '100vh', background: '#f0f3f8', fontFamily: "'Segoe UI', Arial, sans-serif" }}>
      {/* Top Header */}
      <div style={{ background: '#1a2e4a' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 72 }}>
          <div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 22, letterSpacing: 0.4, lineHeight: 1 }}>
              KSB Personality Analyser
            </div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 4, fontWeight: 500, letterSpacing: 0.3 }}>
              DISC Behavioural Assessment · 24 Questions
            </div>
          </div>
          <button
            onClick={() => setHindi((h) => !h)}
            style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 7, padding: '7px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}
          >
            {hindi ? 'English' : 'हिंदी'}
          </button>
        </div>
      </div>

      {/* Welcome + Instructions */}
      <div style={{ maxWidth: 860, margin: '28px auto 0', padding: '0 28px' }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 900, color: '#1a2e4a', lineHeight: 1.2 }}>
            Welcome, <span style={{ color: '#2563a8' }}>{meta.candidate_name}</span>.
          </p>
        </div>

        <div style={{ background: '#1a2e4a', color: '#fff', borderRadius: 10, padding: '16px 22px', marginBottom: 22, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ background: '#c87a2a', color: '#fff', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', whiteSpace: 'nowrap', marginTop: 2, flexShrink: 0 }}>
            Instructions
          </div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 500, lineHeight: 1.65, color: '#fff' }}>
            For each of 24 rows, pick the word <strong style={{ color: '#f0c070' }}>MOST</strong> like you and{' '}
            <strong style={{ color: '#f0c070' }}>LEAST</strong> like you at work.
            Answer instinctively — your first reaction is best.
          </p>
        </div>

        <div style={{ background: '#dce5f0', borderRadius: 4, height: 8, marginBottom: 6 }}>
          <div style={{ height: '100%', borderRadius: 4, background: '#2563a8', width: `${progressPct}%`, transition: 'width .3s' }} />
        </div>
        <p style={{ margin: 0, fontSize: 12, color: '#888', fontWeight: 500 }}>
          {answeredCount} of 24 rows completed · Page {page + 1} of {TOTAL_PAGES}
        </p>
      </div>

      <div style={{ maxWidth: 860, margin: '18px auto 10px', padding: '0 28px' }}>
        <span style={{ fontSize: 12, color: '#777', fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          Rows {pageStart + 1}–{pageStart + ROWS_PER_PAGE} of 24
        </span>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 28px 48px' }}>
        {pageQs.map((q, ri) => {
          const sel       = selections[q.index];
          const rowDone   = sel.most !== null && sel.least !== null;
          const globalRow = pageStart + ri + 1;

          return (
            <div
              key={q.index}
              style={{
                background: '#fff',
                borderRadius: 10,
                marginBottom: 14,
                boxShadow: rowDone ? '0 1px 4px rgba(37,99,168,0.15)' : '0 1px 3px rgba(0,0,0,0.07)',
                border: rowDone ? '1.5px solid #c3d9f5' : '1.5px solid #e8edf4',
                overflow: 'hidden',
                transition: 'border-color .2s, box-shadow .2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#f8fafd', borderBottom: '1px solid #e8edf4' }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: '#1a2e4a', letterSpacing: 0.2 }}>
                  ROW {globalRow}
                  {rowDone && <span style={{ marginLeft: 8, color: '#27ae60', fontSize: 12 }}>✓</span>}
                </span>
                <span style={{ fontSize: 11, color: '#999', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  Pick MOST &amp; LEAST
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', padding: '6px 16px', borderBottom: '1px solid #f0f3f8' }}>
                <span style={{ flex: 1, fontSize: 11, color: '#aaa', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Word</span>
                <span style={{ width: 72, textAlign: 'center', fontSize: 11, color: '#aaa', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Most</span>
                <span style={{ width: 72, textAlign: 'center', fontSize: 11, color: '#aaa', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>Least</span>
              </div>

              {q.words.map((w, wi) => {
                const isMost  = sel.most  === w.dim;
                const isLeast = sel.least === w.dim;
                const highlight = isMost || isLeast;
                return (
                  <div
                    key={wi}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '11px 16px',
                      borderBottom: wi < q.words.length - 1 ? '1px solid #f0f3f8' : 'none',
                      background: highlight ? '#f0f6ff' : 'transparent',
                      transition: 'background .15s',
                    }}
                  >
                    <div style={{ flex: 1, fontSize: 15, fontWeight: highlight ? 600 : 400, color: '#222' }}>
                      <WordTooltip word={w.word} definition={getDefinition(w.word)} />
                    </div>
                    <div style={{ width: 72, display: 'flex', justifyContent: 'center' }}>
                      <input
                        type="radio"
                        name={`most-${q.index}`}
                        checked={isMost}
                        onChange={() => handleSelect(q.index, 'most', w.dim)}
                        disabled={sel.least === w.dim}
                        style={{ width: 20, height: 20, cursor: sel.least === w.dim ? 'not-allowed' : 'pointer', accentColor: '#2563a8' }}
                      />
                    </div>
                    <div style={{ width: 72, display: 'flex', justifyContent: 'center' }}>
                      <input
                        type="radio"
                        name={`least-${q.index}`}
                        checked={isLeast}
                        onChange={() => handleSelect(q.index, 'least', w.dim)}
                        disabled={sel.most === w.dim}
                        style={{ width: 20, height: 20, cursor: sel.most === w.dim ? 'not-allowed' : 'pointer', accentColor: '#2563a8' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <button
            onClick={() => { setPage((p) => p - 1); window.scrollTo(0, 0); }}
            disabled={page === 0}
            style={{ background: '#fff', color: page === 0 ? '#bbb' : '#1a2e4a', border: `1.5px solid ${page === 0 ? '#ddd' : '#1a2e4a'}`, borderRadius: 8, padding: '10px 28px', cursor: page === 0 ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14 }}
          >
            ← Previous
          </button>

          <span style={{ fontSize: 13, color: '#888', fontWeight: 600 }}>
            Page {page + 1} / {TOTAL_PAGES}
          </span>

          {page < TOTAL_PAGES - 1 ? (
            <button
              onClick={() => { setPage((p) => p + 1); window.scrollTo(0, 0); }}
              disabled={!pageComplete}
              style={{ background: pageComplete ? '#1a2e4a' : '#b0bbc8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', cursor: pageComplete ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 14 }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!allComplete || submitting}
              style={{ background: allComplete && !submitting ? '#1a7a42' : '#b0bbc8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', cursor: allComplete && !submitting ? 'pointer' : 'not-allowed', fontWeight: 700, fontSize: 14 }}
            >
              {submitting ? 'Submitting…' : 'Submit Assessment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
