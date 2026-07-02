import React from 'react';
import { useApp } from '../../contexts/AppContext';
import QueryEmbedding from '../graph/QueryEmbedding';
import { COL } from '../../constants';

export default function LeftPanel() {
  const {
    queryText, setQueryText,
    selAlgo, setSelAlgo,
    selMetric, setSelMetric,
    topK, setTopK,
    searching, handleSearch,
    latBig, latSub,
    insertMeta, setInsertMeta,
    insertCat, setInsertCat,
    handleInsertVector,
    queryEmb, benchLoading,
    handleBenchmark, benchData,
    hnswLayers
  } = useApp();

  const renderBenchmark = () => {
    if (!benchData) return null;
    const entries = [
      { label: "BRUTE", key: "bruteForce", color: "#fab387" },
      { label: "KD-TREE", key: "kdTree", color: "#cba6f7" },
      { label: "HNSW", key: "hnsw", color: "#89b4fa" },
    ];
    const maxVal = Math.max(...entries.map((e) => benchData[e.key] || 0), 1);
    return (
      <div style={{ marginTop: 6 }}>
        <span className="label">BENCHMARK (ms)</span>
        {entries.map((e) => {
          const val = benchData[e.key] || 0;
          const pct = (val / maxVal) * 100;
          return (
            <div className="bench-row" key={e.key}>
              <span className="bench-label">{e.label}</span>
              <div className="bench-bar-track">
                <div
                  className="bench-bar-fill"
                  style={{ width: pct + "%", background: e.color }}
                />
              </div>
              <span className="bench-val">{val.toFixed(2)}ms</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderHnswLayers = () => {
    if (!hnswLayers.length) return null;
    const maxNodes = Math.max(...hnswLayers.map((l) => l.nodes || 0), 1);
    return (
      <div>
        <span className="label">HNSW LAYERS</span>
        {hnswLayers.map((layer, i) => (
          <div className="layer-row" key={i}>
            <span className="layer-label">L{layer.level ?? i}</span>
            <div className="layer-bar-track">
              <div
                className="layer-bar-fill"
                style={{ width: ((layer.nodes || 0) / maxNodes) * 100 + "%" }}
              />
            </div>
            <span className="layer-info">
              {layer.nodes || 0}n · {layer.edges || 0}e
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="left-panel">
      {/* Query */}
      <div>
        <span className="label">QUERY</span>
        <input
          className="input-base"
          placeholder="describe a concept …"
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
      </div>

      {/* Algorithm */}
      <div>
        <span className="label">ALGORITHM</span>
        <div className="algo-row">
          {["hnsw", "kdtree", "brute"].map((a) => (
            <button
              key={a}
              className={`algo-btn ${selAlgo === a ? "active" : ""}`}
              onClick={() => setSelAlgo(a)}
            >
              {a === "kdtree" ? "KD-TREE" : a.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Metric */}
      <div>
        <span className="label">DISTANCE METRIC</span>
        <select
          className="input-base"
          value={selMetric}
          onChange={(e) => setSelMetric(e.target.value)}
        >
          <option value="cosine">Cosine</option>
          <option value="euclidean">Euclidean</option>
          <option value="dot">Dot Product</option>
        </select>
      </div>

      {/* Top-K */}
      <div>
        <span className="label">TOP-K: {topK}</span>
        <input
          type="range"
          min="1"
          max="20"
          value={topK}
          onChange={(e) => setTopK(Number(e.target.value))}
        />
      </div>

      {/* Search button */}
      <button
        className="btn-primary"
        onClick={handleSearch}
        disabled={searching || !queryText.trim()}
        style={{ width: "100%", justifyContent: "center" }}
      >
        {searching ? "⟳ Searching …" : "⟐ Search vectors"}
      </button>

      {/* Latency */}
      {latBig && (
        <div className="latency">
          <span>{latSub}:</span>
          <span className="latency-val">{latBig}ms</span>
        </div>
      )}

      {/* Query embedding preview */}
      <QueryEmbedding />

      <div className="section-divider" />

      {/* Legend */}
      <div>
        <span className="label">CATEGORIES</span>
        <div className="legend">
          {Object.entries(COL)
            .filter(([k]) => k !== "default")
            .map(([k, c]) => (
              <div className="legend-item" key={k}>
                <div className="legend-dot" style={{ background: c }} />
                <span>{k}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="section-divider" />

      {/* Insert demo vector */}
      <div>
        <span className="label">INSERT DEMO VECTOR</span>
        <div className="insert-form">
          <input
            className="input-base"
            placeholder="metadata text …"
            value={insertMeta}
            onChange={(e) => setInsertMeta(e.target.value)}
          />
          <select
            className="input-base"
            value={insertCat}
            onChange={(e) => setInsertCat(e.target.value)}
          >
            <option value="cs">cs</option>
            <option value="math">math</option>
            <option value="food">food</option>
            <option value="sports">sports</option>
          </select>
          <button
            className="btn-success"
            onClick={handleInsertVector}
            disabled={!insertMeta.trim()}
          >
            + Insert
          </button>
        </div>
      </div>

      <div className="section-divider" />

      {/* Benchmark */}
      <div>
        <button
          className="btn-secondary"
          onClick={handleBenchmark}
          disabled={!queryEmb || benchLoading}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {benchLoading ? "⟳ Running …" : "⚡ Run benchmark"}
        </button>
        {renderBenchmark()}
      </div>

      {/* HNSW Layers */}
      {renderHnswLayers()}
    </div>
  );
}
