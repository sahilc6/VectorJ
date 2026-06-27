import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchItems,
  searchVectors,
  insertVector,
  deleteVector,
  fetchBenchmark,
  fetchHnswInfo,
  fetchStats,
  fetchStatus,
  insertDocument,
  fetchDocList,
  deleteDocument,
  askAI,
  searchDocuments,
} from "./api";
import {
  DIMS,
  COL,
  DIM_COL,
  textToEmbedding,
  pca2D,
  projectPCA,
} from "./utils";

function hexToRgba(hex, alpha) {
  if (hex.startsWith("#")) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

export default function App() {
  /* ─── State ─── */
  const [allItems, setAllItems] = useState([]);
  const [pcaPoints, setPcaPoints] = useState([]);
  const [pcaModel, setPcaModel] = useState(null);
  const [hitIds, setHitIds] = useState(new Set());
  const [queryPt, setQueryPt] = useState(null);
  const [bounds, setBounds] = useState({
    minX: -1,
    maxX: 1,
    minY: -1,
    maxY: 1,
  });
  const [queryEmb, setQueryEmb] = useState(null);
  const [hoverItem, setHoverItem] = useState(null);
  const [selAlgo, setSelAlgo] = useState("hnsw");
  const [selMetric, setSelMetric] = useState("cosine");
  const [topK, setTopK] = useState(5);
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState("search");
  const [queryText, setQueryText] = useState("");
  const [latBig, setLatBig] = useState(null);
  const [latSub, setLatSub] = useState(null);
  const [benchData, setBenchData] = useState(null);
  const [benchLoading, setBenchLoading] = useState(false);
  const [hnswLayers, setHnswLayers] = useState([]);
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [ollamaModel, setOllamaModel] = useState("");
  const [docList, setDocList] = useState([]);
  const [docTitle, setDocTitle] = useState("");
  const [docText, setDocText] = useState("");
  const [docLoading, setDocLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [ragQ, setRagQ] = useState("");
  const [ragK, setRagK] = useState(3);
  const [ragLoading, setRagLoading] = useState(false);
  const [insertMeta, setInsertMeta] = useState("");
  const [insertCat, setInsertCat] = useState("cs");
  const [totalVectors, setTotalVectors] = useState(0);
  const [dimensions, setDimensions] = useState(0);
  const [searching, setSearching] = useState(false);

  /* ─── Refs ─── */
  const canvasRef = useRef(null);
  const embCanvasRef = useRef(null);
  const tipRef = useRef(null);
  const animRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const chatEndRef = useRef(null);

  /* ─── Helpers ─── */
  const catColor = (c) => COL[c] || COL.default;

  const recomputePCA = useCallback((items) => {
    if (items.length < 2) {
      setPcaPoints([]);
      setPcaModel(null);
      return;
    }
    const embs = items.map((it) => it.embedding);
    const { pts, model } = pca2D(embs);
    setPcaPoints(pts);
    setPcaModel(model);

    let x0 = Infinity,
      x1 = -Infinity,
      y0 = Infinity,
      y1 = -Infinity;
    for (const [px, py] of pts) {
      x0 = Math.min(x0, px);
      x1 = Math.max(x1, px);
      y0 = Math.min(y0, py);
      y1 = Math.max(y1, py);
    }
    const px = (x1 - x0) * 0.18 || 0.1;
    const py = (y1 - y0) * 0.18 || 0.1;
    setBounds({ minX: x0 - px, maxX: x1 + px, minY: y0 - py, maxY: y1 + py });
  }, []);

  /* ─── Load data on mount ─── */
  useEffect(() => {
    async function init() {
      try {
        const items = await fetchDocList();
        items.forEach((it) => (it.category = "doc"));
        setAllItems(items);
        recomputePCA(items);
      } catch (e) {
        console.error("Failed to load items:", e);
      }
      try {
        const info = await fetchHnswInfo();
        if (info && info.layers) setHnswLayers(info.layers);
      } catch (e) {
        /* ignore */
      }
      try {
        const st = await fetchStats();
        if (st) {
          setTotalVectors(st.totalVectors || 0);
          setDimensions(st.dimensions || 0);
        }
      } catch (e) {
        /* ignore */
      }
      try {
        const status = await fetchStatus();
        if (status) {
          setOllamaStatus(status.ollama ? "online" : "offline");
          setOllamaModel(status.model || "");
        }
      } catch (e) {
        setOllamaStatus("offline");
      }
    }
    init();
  }, [recomputePCA]);

  /* ─── Draw scatter plot ─── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let pulse = 0;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(canvas);

    function draw() {
      pulse += 0.045;
      const W = canvas.width / (window.devicePixelRatio || 1);
      const H = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, W, H);

      /* background */
      ctx.fillStyle = "#1e1e2e";
      ctx.fillRect(0, 0, W, H);

      /* grid */
      ctx.strokeStyle = "#252536";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 8; i++) {
        const tx = 70 + (i / 8) * (W - 140);
        const ty = 70 + (i / 8) * (H - 140);
        ctx.beginPath();
        ctx.moveTo(tx, 70);
        ctx.lineTo(tx, H - 70);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(70, ty);
        ctx.lineTo(W - 70, ty);
        ctx.stroke();
      }

      /* axis labels */
      ctx.fillStyle = "#585b70";
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText("PC1", W / 2 - 12, H - 18);
      ctx.save();
      ctx.translate(20, H / 2 + 18);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText("PC2", 0, 0);
      ctx.restore();

      /* title */
      ctx.fillStyle = "#7f849c";
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = "left";
      ctx.fillText("2D PCA PROJECTION · SEMANTIC SPACE", 80, 30);

      if (!allItems.length || !pcaPoints.length) {
        ctx.fillStyle = "#585b70";
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.textAlign = "center";
        ctx.fillText("Connecting to VectorDB…", W / 2, H / 2);
        ctx.textAlign = "left";
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      let { minX, maxX, minY, maxY } = bounds;
      if (queryPt) {
        minX = Math.min(minX, queryPt[0] - 0.2);
        maxX = Math.max(maxX, queryPt[0] + 0.2);
        minY = Math.min(minY, queryPt[1] - 0.2);
        maxY = Math.max(maxY, queryPt[1] + 0.2);
      }

      const w2c = (wx, wy) => {
        const P = 70;
        const rx = maxX - minX || 1;
        const ry = maxY - minY || 1;
        return [
          P + ((wx - minX) / rx) * (W - 2 * P),
          H - P - ((wy - minY) / ry) * (H - 2 * P),
        ];
      };

      /* dashed lines with arrows from query to hits */
      if (queryPt && hitIds.size > 0) {
        const [qx, qy] = w2c(queryPt[0], queryPt[1]);
        allItems.forEach((it, i) => {
          if (hitIds.has(it.id) && pcaPoints[i]) {
            const [px, py] = w2c(pcaPoints[i][0], pcaPoints[i][1]);
            ctx.strokeStyle = "rgba(205,214,244,0.15)";
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(qx, qy);
            ctx.lineTo(px, py);
            ctx.stroke();
            ctx.setLineDash([]);

            const angle = Math.atan2(py - qy, px - qx);
            const rOffset = 12; // shift back to avoid being drawn under the hit circle
            const tipX = px - rOffset * Math.cos(angle);
            const tipY = py - rOffset * Math.sin(angle);
            const headlen = 10;
            ctx.beginPath();
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(
              tipX - headlen * Math.cos(angle - Math.PI / 6),
              tipY - headlen * Math.sin(angle - Math.PI / 6),
            );
            ctx.moveTo(tipX, tipY);
            ctx.lineTo(
              tipX - headlen * Math.cos(angle + Math.PI / 6),
              tipY - headlen * Math.sin(angle + Math.PI / 6),
            );
            ctx.strokeStyle = "rgba(205,214,244,0.8)";
            ctx.lineWidth = 1.8;
            ctx.stroke();
          }
        });
      }

      /* track hover */
      let hoveredIdx = -1;
      let bestD = 18;
      const mx = mouseRef.current.x,
        my = mouseRef.current.y;

      allItems.forEach((it, i) => {
        if (!pcaPoints[i]) return;
        const [cx, cy] = w2c(pcaPoints[i][0], pcaPoints[i][1]);
        const d = Math.hypot(mx - cx, my - cy);
        if (d < bestD) {
          bestD = d;
          hoveredIdx = i;
        }
      });

      /* draw points */
      allItems.forEach((it, i) => {
        if (!pcaPoints[i]) return;
        const [cx, cy] = w2c(pcaPoints[i][0], pcaPoints[i][1]);
        const isHit = hitIds.has(it.id);
        const r = isHit ? 7 : 5.5;
        const col = catColor(it.category);

        /* pulse ring on hits */
        if (isHit) {
          const pr = r + 6 + Math.sin(pulse) * 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, pr, 0, Math.PI * 2);
          ctx.strokeStyle = hexToRgba(col, 0.4);
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        /* dot */
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();

        /* hovered */
        if (hoveredIdx === i) {
          ctx.beginPath();
          ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
          ctx.strokeStyle = col;
          ctx.lineWidth = 1.3;
          ctx.stroke();
        }
      });

      /* query crosshair */
      if (queryPt) {
        const [qx, qy] = w2c(queryPt[0], queryPt[1]);
        ctx.save();
        ctx.translate(qx, qy);
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(137,180,250,.45)";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-16, 0);
        ctx.lineTo(-13, 0);
        ctx.moveTo(13, 0);
        ctx.lineTo(16, 0);
        ctx.moveTo(0, -16);
        ctx.lineTo(0, -13);
        ctx.moveTo(0, 13);
        ctx.lineTo(0, 16);
        ctx.strokeStyle = "#89b4fa";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = "#89b4fa";
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#7f849c";
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = "left";
        ctx.fillText("query", qx + 18, qy + 4);
      }

      if (hoveredIdx >= 0) {
        setHoverItem(allItems[hoveredIdx]);
      } else {
        setHoverItem(null);
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => {
      resizeObserver.disconnect();
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [allItems, pcaPoints, hitIds, queryPt, bounds]);

  /* ─── Mouse tracking on canvas ─── */
  const handleCanvasMouseMove = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (tipRef.current) {
      tipRef.current.style.left = e.clientX + 14 + "px";
      tipRef.current.style.top = e.clientY - 8 + "px";
    }
  }, []);

  /* ─── Draw query embedding mini canvas ─── */
  useEffect(() => {
    const c = embCanvasRef.current;
    if (!c || !queryEmb) return;
    const ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = rect.width,
      H = rect.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#1e1e2e";
    ctx.fillRect(0, 0, W, H);

    const bw = (W - 4) / DIMS;
    queryEmb.forEach((v, i) => {
      const h = v * H * 0.92;
      const x = 2 + i * bw;
      ctx.fillStyle = DIM_COL[i] || "#89b4fa";
      ctx.fillRect(x + 1, H - h - 2, bw - 2, h);
    });

    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.textAlign = "center";
    const labels = [
      ["CS", 0],
      ["MATH", 4],
      ["FOOD", 8],
      ["SPORT", 12],
    ];
    const colors = ["#89b4fa", "#cba6f7", "#fab387", "#a6e3a1"];
    labels.forEach(([lbl, gi], i) => {
      ctx.fillStyle = hexToRgba(colors[i], 0.66);
      ctx.fillText(lbl, 2 + (gi + 1.5) * bw, H / 2 + 3);
    });
    ctx.textAlign = "left";
  }, [queryEmb]);

  /* ─── Search handler ─── */
  const handleSearch = useCallback(async () => {
    if (!queryText.trim()) return;
    setSearching(true);
    try {
      const t0 = performance.now();
      const res = await searchDocuments(queryText, topK);
      const elapsed = performance.now() - t0;
      setLatBig(elapsed.toFixed(1));
      setLatSub("DOCS");
      setQueryEmb(res.queryEmbedding);
      setSearchResults(res.hits);
      setHitIds(new Set(res.hits.map((r) => r.id)));

      if (res.hits.length > 0 && pcaModel) {
        setQueryPt(projectPCA(res.queryEmbedding, pcaModel));
      } else {
        setQueryPt(null);
      }

      setActiveTab("search");
    } catch (e) {
      console.error("Search failed:", e);
    }
    setSearching(false);
  }, [queryText, topK, pcaModel, allItems, recomputePCA]);

  /* ─── Delete vector ─── */
  const handleDeleteVector = useCallback(
    async (id) => {
      try {
        await deleteVector(id);
        const items = await fetchItems();
        setAllItems(items);
        setSearchResults((prev) => prev.filter((r) => r.id !== id));
        setHitIds((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
        recomputePCA(items);
        setTotalVectors(items.length);
      } catch (e) {
        console.error("Delete failed:", e);
      }
    },
    [queryEmb, recomputePCA],
  );

  /* ─── Insert demo vector ─── */
  const handleInsertVector = useCallback(async () => {
    if (!insertMeta.trim()) return;
    const emb = textToEmbedding(insertMeta);
    try {
      await insertVector(insertMeta, insertCat, emb);
      const items = await fetchItems();
      setAllItems(items);
      recomputePCA(items);
      setInsertMeta("");
      setTotalVectors(items.length);
    } catch (e) {
      console.error("Insert failed:", e);
    }
  }, [insertMeta, insertCat, queryEmb, recomputePCA]);

  /* ─── Benchmark ─── */
  const handleBenchmark = useCallback(async () => {
    if (!queryEmb) return;
    setBenchLoading(true);
    try {
      const v = queryEmb.join(",");
      const data = await fetchBenchmark(v, topK, selMetric);
      setBenchData(data);
    } catch (e) {
      console.error("Benchmark failed:", e);
    }
    setBenchLoading(false);
  }, [queryEmb, topK, selMetric]);

  /* ─── Documents: insert ─── */
  const handleInsertDoc = useCallback(async () => {
    if (!docTitle.trim() || !docText.trim()) return;
    setDocLoading(true);
    try {
      await insertDocument(docTitle, docText);
      const list = await fetchDocList();
      setDocList(list);
      setDocTitle("");
      setDocText("");
    } catch (e) {
      console.error("Doc insert failed:", e);
    }
    setDocLoading(false);
  }, [docTitle, docText]);

  /* ─── Documents: load list when switching to docs tab ─── */
  useEffect(() => {
    if (activeTab === "docs") {
      fetchDocList()
        .then(setDocList)
        .catch(() => {});
      fetchStatus()
        .then((s) => {
          if (s) {
            setOllamaStatus(s.ollama ? "online" : "offline");
            setOllamaModel(s.model || "");
          }
        })
        .catch(() => setOllamaStatus("offline"));
    }
  }, [activeTab]);

  /* ─── Documents: delete ─── */
  const handleDeleteDoc = useCallback(async (id) => {
    try {
      await deleteDocument(id);
      const list = await fetchDocList();
      setDocList(list);
    } catch (e) {
      console.error("Doc delete failed:", e);
    }
  }, []);

  /* ─── Ask AI ─── */
  const handleAsk = useCallback(async () => {
    if (!ragQ.trim()) return;
    const question = ragQ;
    setRagQ("");
    setRagLoading(true);
    setChatHistory((prev) => [...prev, { type: "q", text: question }]);
    try {
      const resp = await askAI(question, ragK);
      setChatHistory((prev) => [
        ...prev,
        {
          type: "a",
          text: resp.answer || "No answer received.",
          contexts: resp.contexts || [],
          expandedCtx: null,
          revealed: 0,
        },
      ]);
    } catch (e) {
      setChatHistory((prev) => [
        ...prev,
        {
          type: "a",
          text: "Error: Failed to get response.",
          contexts: [],
          expandedCtx: null,
          revealed: 0,
        },
      ]);
    }
    setRagLoading(false);
  }, [ragQ, ragK]);

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
  }, [chatHistory]);

  /* ─── Auto-scroll chat ─── */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  /* ─── Toggle context expansion ─── */
  const toggleCtx = useCallback((chatIdx, ctxIdx) => {
    setChatHistory((prev) => {
      const copy = [...prev];
      const entry = { ...copy[chatIdx] };
      entry.expandedCtx = entry.expandedCtx === ctxIdx ? null : ctxIdx;
      copy[chatIdx] = entry;
      return copy;
    });
  }, []);

  /* ─── Benchmark rendering helper ─── */
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

  /* ─── HNSW layers rendering ─── */
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

  /* ─── Category badge class ─── */
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

  /* ═══════════════════════════════ RENDER ═══════════════════════════════ */
  return (
    <>
      {/* ─── Header ─── */}
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

      {/* ─── Layout ─── */}
      <div className="layout">
        {/* ─── Left Panel ─── */}
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
          {queryEmb && (
            <div>
              <span className="label">QUERY EMBEDDING</span>
              <canvas ref={embCanvasRef} className="emb-canvas" />
            </div>
          )}

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

        {/* ─── Center Panel (Scatter Plot) ─── */}
        <div className="center-panel">
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%", display: "block" }}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => setHoverItem(null)}
          />
        </div>

        {/* ─── Right Panel ─── */}
        <div className="right-panel">
          {/* Tabs */}
          <div className="tabs">
            {[
              { key: "search", label: "SEARCH" },
              { key: "docs", label: "DOCUMENTS" },
              { key: "rag", label: "ASK AI" },
            ].map((t) => (
              <div
                key={t.key}
                className={`tab ${activeTab === t.key ? "active" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </div>
            ))}
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {/* ─── SEARCH TAB ─── */}
            {activeTab === "search" && (
              <>
                {searchResults.length === 0 && (
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
                )}
                {searchResults.map((r, i) => (
                  <div className="result-card" key={r.id}>
                    <div className="result-card-header">
                      <span className="result-rank">#{i + 1}</span>
                      <span className="result-meta" title={r.metadata}>
                        {r.metadata}
                      </span>
                      <span className={`badge ${catBadgeClass(r.category)}`}>
                        {r.category}
                      </span>
                    </div>
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
            )}

            {/* ─── DOCUMENTS TAB ─── */}
            {activeTab === "docs" && (
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
            )}

            {/* ─── ASK AI TAB ─── */}
            {activeTab === "rag" && (
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
            )}
          </div>
        </div>
      </div>

      {/* ─── Tooltip ─── */}
      <div ref={tipRef} className={`tip ${hoverItem ? "visible" : ""}`}>
        {hoverItem && (
          <>
            <span
              style={{ color: catColor(hoverItem.category), fontWeight: 600 }}
            >
              {hoverItem.category}
            </span>
            {" · "}
            <span>{hoverItem.metadata}</span>
          </>
        )}
      </div>
    </>
  );
}
