import React, { useEffect, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import { COL } from '../../constants';

export default function Tooltip() {
  const { hoverItem } = useApp();
  const tipRef = useRef(null);

  const catColor = (c) => COL[c] || COL.default;

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (tipRef.current) {
        tipRef.current.style.left = e.detail.clientX + 14 + "px";
        tipRef.current.style.top = e.detail.clientY - 8 + "px";
      }
    };

    window.addEventListener('canvas-mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('canvas-mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div ref={tipRef} className={`tip ${hoverItem ? "visible" : ""}`}>
      {hoverItem && (
        <>
          <span
            style={{ color: catColor(hoverItem.category), fontWeight: 600 }}
          >
            {hoverItem.category}
          </span>
          {" · "}
          <span>{hoverItem.metadata || hoverItem.title}</span>
        </>
      )}
    </div>
  );
}
