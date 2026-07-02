import React, { useEffect, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';

export default function Tooltip() {
  const { hoverItem } = useApp();
  const tipRef = useRef(null);

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

  const renderContent = () => {
    if (!hoverItem) return null;

    if (hoverItem.type === "document") {
      return (
        <>
          <span style={{ color: hoverItem.color, fontWeight: 600 }}>
            {hoverItem.docName}
          </span>
          <span style={{ color: "#7f849c", marginLeft: 6 }}>
            {hoverItem.chunkCount} chunk{hoverItem.chunkCount !== 1 ? "s" : ""}
          </span>
          <br />
          <span style={{ color: "#585b70", fontSize: 9 }}>
            {hoverItem.isExpanded ? "click to collapse" : "click to expand chunks"}
          </span>
        </>
      );
    }

    if (hoverItem.type === "chunk") {
      return (
        <>
          <span style={{ color: hoverItem.color, fontWeight: 600 }}>
            {hoverItem.docName}
          </span>
          <span style={{ color: "#7f849c", marginLeft: 6 }}>
            chunk {hoverItem.chunkIndex}/{hoverItem.totalChunks}
          </span>
          {hoverItem.text && (
            <>
              <br />
              <span style={{ color: "#a6adc8", fontSize: 9 }}>
                {hoverItem.text.length > 80
                  ? hoverItem.text.slice(0, 78) + "…"
                  : hoverItem.text}
              </span>
            </>
          )}
        </>
      );
    }

    /* Legacy fallback for vector items */
    return (
      <>
        <span style={{ color: hoverItem.color || "#94e2d5", fontWeight: 600 }}>
          {hoverItem.category || "doc"}
        </span>
        {" · "}
        <span>{hoverItem.metadata || hoverItem.title}</span>
      </>
    );
  };

  return (
    <div ref={tipRef} className={`tip ${hoverItem ? "visible" : ""}`}>
      {renderContent()}
    </div>
  );
}
