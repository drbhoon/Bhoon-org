import { useState } from 'react';

const iconStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 18, height: 18, borderRadius: '50%', background: '#e0e8f5',
  color: '#2E5496', fontSize: 11, fontWeight: 700, cursor: 'pointer',
  flexShrink: 0, userSelect: 'none', border: 'none', padding: 0,
};

export default function WordTooltip({ word, definition }) {
  const [pos, setPos] = useState(null);

  function showAt(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
  }

  function hide() { setPos(null); }

  function tooltipStyle() {
    const W = 300;
    let left = (pos?.x ?? 0) - W / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - W - 8));
    return {
      position: 'fixed',
      zIndex: 9999,
      background: '#1F3864',
      color: '#fff',
      padding: '10px 14px',
      borderRadius: 8,
      fontSize: 13,
      lineHeight: 1.65,
      width: W,
      boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
      pointerEvents: 'none',
      whiteSpace: 'normal',
      top: (pos?.y ?? 0) - 0,
      left,
      transform: 'translateY(-100%)',
    };
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 15, color: '#222' }}>{word}</span>
      <button
        style={iconStyle}
        onMouseEnter={showAt}
        onMouseLeave={hide}
        onTouchStart={(e) => { e.stopPropagation(); pos ? hide() : showAt(e); }}
        aria-label={`Definition of ${word}`}
        type="button"
      >
        i
      </button>
      {pos && definition && (
        <span style={tooltipStyle()}>{definition}</span>
      )}
    </span>
  );
}
