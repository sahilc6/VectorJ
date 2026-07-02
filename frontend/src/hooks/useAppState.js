import { useState, useEffect, useCallback, useRef } from "react";
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
} from "../services/api";
import { textToEmbedding, pca2D, projectPCA, groupChunksByDocument } from "../utils";
import { DOC_PALETTE } from "../constants";

export function useAppState() {
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
  const [docGroups, setDocGroups] = useState([]);
  const [expandedDoc, setExpandedDoc] = useState(null);

  /* ─── Helpers ─── */
  const recomputePCA = useCallback((items) => {
    if (items.length < 2) {
      setPcaPoints([]);
      setPcaModel(null);
      setDocGroups([]);
      return;
    }
    const embs = items.map((it) => it.embedding);
    const { pts, model } = pca2D(embs);
    setPcaPoints(pts);
    setPcaModel(model);

    /* Compute document groups with centroid PCA points */
    const groups = groupChunksByDocument(items);
    const enrichedGroups = groups.map((g, gi) => {
      const centroidPt = projectPCA(g.centroidEmb, model);
      /* Map chunk indices into the allItems array for PCA lookup */
      const chunkIndices = g.chunks.map((c) => items.indexOf(c));
      const chunkPts = chunkIndices.map((idx) => pts[idx] || [0, 0]);
      return {
        ...g,
        centroidPt,
        chunkPts,
        chunkIndices,
        color: DOC_PALETTE[gi % DOC_PALETTE.length],
      };
    });
    setDocGroups(enrichedGroups);

    /* Compute bounds from centroids (tighter, less clutter) */
    let x0 = Infinity,
      x1 = -Infinity,
      y0 = Infinity,
      y1 = -Infinity;
    for (const g of enrichedGroups) {
      const [gx, gy] = g.centroidPt;
      x0 = Math.min(x0, gx);
      x1 = Math.max(x1, gx);
      y0 = Math.min(y0, gy);
      y1 = Math.max(y1, gy);
    }
    /* Also include chunk points in bounds for expanded view */
    for (const [px, py] of pts) {
      x0 = Math.min(x0, px);
      x1 = Math.max(x1, px);
      y0 = Math.min(y0, py);
      y1 = Math.max(y1, py);
    }
    const padX = (x1 - x0) * 0.18 || 0.1;
    const padY = (y1 - y0) * 0.18 || 0.1;
    setBounds({ minX: x0 - padX, maxX: x1 + padX, minY: y0 - padY, maxY: y1 + padY });
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
      setSearchResults(res.hits || []);
      setHitIds(new Set((res.hits || []).map((r) => r.id)));

      if ((res.hits || []).length > 0 && pcaModel && res.queryEmbedding) {
        setQueryPt(projectPCA(res.queryEmbedding, pcaModel));
      } else {
        setQueryPt(null);
      }

      setActiveTab("search");
    } catch (e) {
      console.error("Search failed:", e);
    }
    setSearching(false);
  }, [queryText, topK, pcaModel]);

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
      if (resp.queryEmbedding) {
        setQueryEmb(resp.queryEmbedding);
      }
      if (resp.hitIds) {
        setHitIds(new Set(resp.hitIds));
        if (resp.hitIds.length > 0 && pcaModel && resp.queryEmbedding) {
          setQueryPt(projectPCA(resp.queryEmbedding, pcaModel));
        } else {
          setQueryPt(null);
        }
      }
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
  }, [ragQ, ragK, pcaModel]);

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

  return {
    allItems, setAllItems,
    pcaPoints, setPcaPoints,
    pcaModel, setPcaModel,
    docGroups,
    expandedDoc, setExpandedDoc,
    hitIds, setHitIds,
    queryPt, setQueryPt,
    bounds, setBounds,
    queryEmb, setQueryEmb,
    hoverItem, setHoverItem,
    selAlgo, setSelAlgo,
    selMetric, setSelMetric,
    topK, setTopK,
    searchResults, setSearchResults,
    activeTab, setActiveTab,
    queryText, setQueryText,
    latBig, setLatBig,
    latSub, setLatSub,
    benchData, setBenchData,
    benchLoading, setBenchLoading,
    hnswLayers, setHnswLayers,
    ollamaStatus, setOllamaStatus,
    ollamaModel, setOllamaModel,
    docList, setDocList,
    docTitle, setDocTitle,
    docText, setDocText,
    docLoading, setDocLoading,
    chatHistory, setChatHistory,
    ragQ, setRagQ,
    ragK, setRagK,
    ragLoading, setRagLoading,
    insertMeta, setInsertMeta,
    insertCat, setInsertCat,
    totalVectors, setTotalVectors,
    dimensions, setDimensions,
    searching, setSearching,
    handleSearch,
    handleDeleteVector,
    handleInsertVector,
    handleBenchmark,
    handleInsertDoc,
    handleDeleteDoc,
    handleAsk,
    toggleCtx,
  };
}
