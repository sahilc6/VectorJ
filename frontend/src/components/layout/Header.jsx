import React from 'react';
import { useApp } from '../../contexts/AppContext';

export default function Header() {
  const { ollamaStatus, totalVectors, dimensions } = useApp();

  return (
    <header className="header">
      <span className="header-title">▸ VectorJ</span>
      <div className="header-badges">
        <span className="badge badge-accent">HNSW</span>
        <span className="badge badge-mauve">KD-TREE</span>
        <span className="badge badge-peach">BRUTE FORCE</span>
        <span
          className={`badge ${ollamaStatus === "online" ? "badge-green" : "badge-red"}`}
        >
          OLLAMA {ollamaStatus === "online" ? "✓" : "✗"}
        </span>
      </div>
      <span className="header-stats">
        {totalVectors} vectors · {dimensions}D
      </span>
    </header>
  );
}
