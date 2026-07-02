import React from 'react';
import { useApp } from '../../contexts/AppContext';

export default function DocsTab() {
  const {
    ollamaStatus,
    ollamaModel,
    docTitle,
    setDocTitle,
    docText,
    setDocText,
    handleInsertDoc,
    docLoading,
    docList,
    handleDeleteDoc
  } = useApp();

  return (
    <>
      {/* Ollama status */}
      <div
        className={`ollama-status ${ollamaStatus === "online" ? "online" : "offline"}`}
      >
        <div
          className={`ollama-dot ${ollamaStatus === "online" ? "online" : "offline"}`}
        />
        <span>
          Ollama:{" "}
          {ollamaStatus === "online" ? "connected" : "offline"}
          {ollamaModel && ` · ${ollamaModel}`}
        </span>
      </div>

      {/* Insert document form */}
      <div className="card">
        <span className="label">EMBED DOCUMENT</span>
        <div className="insert-form">
          <input
            className="input-base"
            placeholder="Document title"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
          />
          <textarea
            className="input-base"
            placeholder="Paste document text …"
            value={docText}
            onChange={(e) => setDocText(e.target.value)}
            rows={3}
          />
          <button
            className="btn-primary"
            onClick={handleInsertDoc}
            disabled={
              docLoading || !docTitle.trim() || !docText.trim()
            }
          >
            {docLoading ? "⟳ Embedding …" : "↑ Embed & store"}
          </button>
        </div>
      </div>

      {/* Doc list */}
      <span className="label">
        STORED DOCUMENTS ({docList.length})
      </span>
      {docList.length === 0 && (
        <div
          style={{
            textAlign: "center",
            color: "var(--editor-muted)",
            fontSize: 11,
          }}
        >
          No documents stored yet
        </div>
      )}
      {docList.map((doc) => (
        <div className="doc-card" key={doc.id}>
          <div className="doc-card-title">{doc.title}</div>
          <div className="doc-card-text">{doc.text}</div>
          <div className="doc-card-footer">
            <span className="badge badge-teal">doc</span>
            <button
              className="btn-danger"
              onClick={() => handleDeleteDoc(doc.id)}
            >
              ✕ delete
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
