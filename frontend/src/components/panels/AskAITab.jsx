import React, { useEffect, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';

export default function AskAITab() {
  const {
    ragQ,
    setRagQ,
    ragK,
    setRagK,
    handleAsk,
    ragLoading,
    chatHistory,
    setChatHistory,
    toggleCtx
  } = useApp();
  
  const chatEndRef = useRef(null);

  /* ─── Typewriter effect for last AI answer ─── */
  useEffect(() => {
    const lastIdx = chatHistory.length - 1;
    if (lastIdx < 0) return;
    const last = chatHistory[lastIdx];
    if (last.type !== "a" || last.revealed === undefined) return;
    if (last.revealed >= last.text.length) return;

    const interval = setInterval(() => {
      setChatHistory((prev) => {
        const copy = [...prev];
        const entry = { ...copy[lastIdx] };
        entry.revealed = Math.min(entry.revealed + 3, entry.text.length);
        copy[lastIdx] = entry;
        return copy;
      });
    }, 18);

    return () => clearInterval(interval);
  }, [chatHistory, setChatHistory]);

  /* ─── Auto-scroll chat ─── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  return (
    <>
      {/* Question form */}
      <div className="card">
        <span className="label">ASK A QUESTION (RAG)</span>
        <div className="insert-form">
          <textarea
            className="input-base"
            placeholder="Ask anything about your documents …"
            value={ragQ}
            onChange={(e) => setRagQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAsk();
              }
            }}
            rows={2}
          />
          <div
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
            <span
              className="label"
              style={{ margin: 0, whiteSpace: "nowrap" }}
            >
              Top-K: {ragK}
            </span>
            <input
              type="range"
              min="1"
              max="10"
              value={ragK}
              onChange={(e) => setRagK(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <button
              className="btn-primary"
              onClick={handleAsk}
              disabled={ragLoading || !ragQ.trim()}
            >
              {ragLoading ? "⟳" : "⟐"} Ask
            </button>
          </div>
        </div>
      </div>

      {/* Chat history */}
      <div className="chat-history">
        {chatHistory.map((entry, ci) => {
          if (entry.type === "q") {
            return (
              <div className="chat-q" key={ci}>
                ❯ {entry.text}
              </div>
            );
          }
          /* answer */
          const isTyping =
            entry.revealed !== undefined &&
            entry.revealed < entry.text.length;
          const visibleText =
            entry.revealed !== undefined
              ? entry.text.slice(0, entry.revealed)
              : entry.text;
          return (
            <div key={ci} style={{ animation: "fadeUp .25s ease" }}>
              <div className="chat-a-label">▸ VECTORJ AI</div>
              <div
                className={`chat-a-text ${isTyping ? "typing" : ""}`}
              >
                {visibleText}
              </div>
              {entry.contexts && entry.contexts.length > 0 && (
                <div className="chat-ctx">
                  {entry.contexts.map((ctx, cxi) => (
                    <React.Fragment key={cxi}>
                      <span
                        className="ctx-chip"
                        onClick={() => toggleCtx(ci, cxi)}
                      >
                        📄 {ctx.title || `Context ${cxi + 1}`}
                      </span>
                      {entry.expandedCtx === cxi && (
                        <div
                          className="ctx-expand"
                          style={{ width: "100%" }}
                        >
                          {ctx.text ||
                            ctx.content ||
                            JSON.stringify(ctx)}
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {ragLoading && (
          <div className="thinking">
            <div className="spinner" />
            <span>Thinking …</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
    </>
  );
}
