import React from 'react';
import { useApp } from '../../contexts/AppContext';

export default function SearchTab() {
  const { searchResults, handleDeleteVector } = useApp();

  const catBadgeClass = (cat) => {
    const map = {
      cs: "badge-accent",
      math: "badge-mauve",
      food: "badge-peach",
      sports: "badge-green",
      doc: "badge-teal",
    };
    return map[cat] || "badge-muted";
  };

  if (searchResults.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          color: "var(--editor-muted)",
          fontSize: 11,
          paddingTop: 30,
        }}
      >
        Enter a query and search to see results
      </div>
    );
  }

  return (
    <>
      {searchResults.map((r, i) => (
        <div className="result-card" key={r.id}>
          <div className="result-card-header">
            <span className="result-rank">#{i + 1}</span>
            <span className="result-meta" title={r.metadata || r.title}>
              {r.metadata || r.title}
            </span>
            <span className={`badge ${catBadgeClass(r.category || "doc")}`}>
              {r.category || "doc"}
            </span>
          </div>
          {r.text && (
            <div style={{
              fontSize: 10,
              color: "var(--editor-muted)",
              padding: "4px 0",
              lineHeight: 1.4,
              maxHeight: 60,
              overflow: "hidden"
            }}>
              {r.text.length > 150 ? r.text.slice(0, 150) + "…" : r.text}
            </div>
          )}
          <div className="result-actions">
            <span className="result-distance">
              dist:{" "}
              {typeof r.distance === "number"
                ? r.distance.toFixed(4)
                : r.distance}
            </span>
            <span style={{ flex: 1 }} />
            <button
              className="btn-danger"
              onClick={() => handleDeleteVector(r.id)}
            >
              ✕ delete
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
