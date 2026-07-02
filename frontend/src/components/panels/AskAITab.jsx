import React, { useEffect, useRef } from "react";
import { useApp } from "../../contexts/AppContext";

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
    toggleCtx,
  } = useApp();

  const chatEndRef = useRef(null);

  /* ─── Handlers ─── */
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  /* ─── Effects ─── */
  // Typewriter effect for the last AI answer
  useEffect(() => {
    const lastIdx = chatHistory.length - 1;
    if (lastIdx < 0) return;

    const last = chatHistory[lastIdx];
    const isTypingNeeded =
      last.type === "a" &&
      last.revealed !== undefined &&
      last.revealed < last.text.length;

    if (!isTypingNeeded) return;

    const interval = setInterval(() => {
      setChatHistory((prev) => {
        const newHistory = [...prev];
        const lastEntry = { ...newHistory[lastIdx] };

        lastEntry.revealed = Math.min(
          lastEntry.revealed + 3,
          lastEntry.text.length,
        );
        newHistory[lastIdx] = lastEntry;

        return newHistory;
      });
    }, 18);

    return () => clearInterval(interval);
  }, [chatHistory, setChatHistory]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  /* ─── Render Helpers ─── */
  const renderContexts = (entry, msgIndex) => {
    if (!entry.contexts || entry.contexts.length === 0) return null;

    return (
      <div className="chat-ctx" style={{ marginTop: "8px" }}>
        {entry.contexts.map((ctx, ctxIndex) => (
          <React.Fragment key={ctxIndex}>
            <span
              className="ctx-chip"
              onClick={() => toggleCtx(msgIndex, ctxIndex)}
            >
              📄 {ctx.title || `Context ${ctxIndex + 1}`}
            </span>

            {entry.expandedCtx === ctxIndex && (
              <div className="ctx-expand">
                {ctx.text || ctx.content || JSON.stringify(ctx)}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="ai-chat-panel">
      {/* ─── Chat History (Top, Main, Scrollable) ─── */}
      <div className="chat-history">
        {chatHistory.length === 0 && (
          <div className="chat-empty-state">
            <h2
              style={{
                fontSize: "14px",
                color: "var(--editor-text)",
                marginBottom: "8px",
              }}
            >
              How can I help you today?
            </h2>
            <p>Ask a question based on your documents.</p>
          </div>
        )}

        {chatHistory.map((entry, msgIndex) => {
          // Render User Question (Aligned Right)
          if (entry.type === "q") {
            return (
              <div key={msgIndex} className="message-row user">
                <div className="chat-q">{entry.text}</div>
              </div>
            );
          }

          // Render AI Answer (Aligned Left)
          const isTyping =
            entry.revealed !== undefined && entry.revealed < entry.text.length;
          const visibleText =
            entry.revealed !== undefined
              ? entry.text.slice(0, entry.revealed)
              : entry.text;

          return (
            <div key={msgIndex} className="message-row ai">
              <div className="message-content">
                <div className="chat-a-label">✨ VECTORJ AI</div>
                <div className={`chat-a-text ${isTyping ? "typing" : ""}`}>
                  {visibleText}
                </div>
                {renderContexts(entry, msgIndex)}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {ragLoading && (
          <div className="message-row ai">
            <div className="thinking">
              <div className="spinner" />
              <span>Thinking …</span>
            </div>
          </div>
        )}

        {/* Auto-Scroll Anchor */}
        <div ref={chatEndRef} style={{ height: "1px" }} />
      </div>

      {/* ─── Question Form (Bottom, Fixed Input Area) ─── */}
      <div className="chat-input-wrapper">
        <div className="chat-input-container">
          <textarea
            className="input-base chat-textarea"
            placeholder="Ask anything about your documents …"
            value={ragQ}
            onChange={(e) => setRagQ(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />

          <div className="chat-input-controls">
            {/* Top-K Settings */}
            <div className="chat-topk-control">
              <span className="label" style={{ margin: 0 }}>
                Top-K:{" "}
                <strong style={{ color: "var(--editor-accent)" }}>
                  {ragK}
                </strong>
              </span>
              <input
                type="range"
                min="1"
                max="10"
                value={ragK}
                onChange={(e) => setRagK(Number(e.target.value))}
                style={{ width: "100px", cursor: "pointer" }}
              />
            </div>

            {/* Ask Button */}
            <button
              className="btn-primary btn-chat"
              onClick={handleAsk}
              disabled={ragLoading || !ragQ.trim()}
            >
              {ragLoading ? "⟳" : "↑"} Ask AI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
