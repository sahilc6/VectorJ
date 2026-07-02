import React, { useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { hexToRgba } from '../../utils/colors';

export default function ScatterPlot() {
  const {
    docGroups, expandedDoc, setExpandedDoc,
    hitIds, queryPt, bounds, setHoverItem,
  } = useApp();

  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });

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

    const resizeObserver = new ResizeObserver(() => resize());
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
        ctx.beginPath(); ctx.moveTo(tx, 70); ctx.lineTo(tx, H - 70); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(70, ty); ctx.lineTo(W - 70, ty); ctx.stroke();
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
      ctx.fillText("2D PCA PROJECTION · DOCUMENT CLUSTERS", 80, 30);

      if (!docGroups.length) {
        ctx.fillStyle = "#585b70";
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.textAlign = "center";
        ctx.fillText("Connecting to VectorDB…", W / 2, H / 2);
        ctx.textAlign = "left";
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      /* bounds with query expansion */
      let { minX, maxX, minY, maxY } = bounds;
      if (queryPt) {
        minX = Math.min(minX, queryPt[0] - 0.2);
        maxX = Math.max(maxX, queryPt[0] + 0.2);
        minY = Math.min(minY, queryPt[1] - 0.2);
        maxY = Math.max(maxY, queryPt[1] + 0.2);
      }

      const P = 70;
      const w2c = (wx, wy) => {
        const rx = maxX - minX || 1;
        const ry = maxY - minY || 1;
        return [
          P + ((wx - minX) / rx) * (W - 2 * P),
          H - P - ((wy - minY) / ry) * (H - 2 * P),
        ];
      };

      /* ─── Draw dashed lines from query to hit documents ─── */
      if (queryPt && hitIds.size > 0) {
        const [qx, qy] = w2c(queryPt[0], queryPt[1]);
        for (const g of docGroups) {
          const hasHit = [...g.chunkIds].some((id) => hitIds.has(id));
          if (!hasHit) continue;

          if (expandedDoc === g.docName) {
            /* Draw lines to individual hit chunks */
            g.chunkPts.forEach((cp, ci) => {
              const chunkId = g.chunks[ci]?.id;
              if (!hitIds.has(chunkId)) return;
              const [px, py] = w2c(cp[0], cp[1]);
              drawDashedArrow(ctx, qx, qy, px, py);
            });
          } else {
            /* Draw line to centroid */
            const [cx, cy] = w2c(g.centroidPt[0], g.centroidPt[1]);
            drawDashedArrow(ctx, qx, qy, cx, cy);
          }
        }
      }

      /* ─── Hover detection ─── */
      const mx = mouseRef.current.x, my = mouseRef.current.y;
      let hoveredGroup = null;
      let hoveredChunkIdx = -1;
      let bestD = 22;

      for (const g of docGroups) {
        if (expandedDoc === g.docName) {
          /* Check individual chunks */
          g.chunkPts.forEach((cp, ci) => {
            const [cx, cy] = w2c(cp[0], cp[1]);
            const d = Math.hypot(mx - cx, my - cy);
            if (d < bestD) {
              bestD = d;
              hoveredGroup = g;
              hoveredChunkIdx = ci;
            }
          });
        }
        /* Always check centroid */
        const [cx, cy] = w2c(g.centroidPt[0], g.centroidPt[1]);
        const d = Math.hypot(mx - cx, my - cy);
        if (d < bestD) {
          bestD = d;
          hoveredGroup = g;
          hoveredChunkIdx = -1; // hovering centroid, not a chunk
        }
      }

      /* ─── Draw document groups ─── */
      for (const g of docGroups) {
        const [cx, cy] = w2c(g.centroidPt[0], g.centroidPt[1]);
        const col = g.color;
        const isExpanded = expandedDoc === g.docName;
        const hasHit = [...g.chunkIds].some((id) => hitIds.has(id));
        const isHoveredGroup = hoveredGroup === g && hoveredChunkIdx === -1;

        if (isExpanded) {
          /* ─── EXPANDED: Show centroid + individual chunks ─── */

          /* Draw thin lines from centroid to each chunk */
          ctx.strokeStyle = hexToRgba(col, 0.2);
          ctx.lineWidth = 1;
          for (const cp of g.chunkPts) {
            const [px, py] = w2c(cp[0], cp[1]);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(px, py);
            ctx.stroke();
          }

          /* Draw chunk dots */
          g.chunkPts.forEach((cp, ci) => {
            const [px, py] = w2c(cp[0], cp[1]);
            const chunkId = g.chunks[ci]?.id;
            const isChunkHit = hitIds.has(chunkId);
            const isChunkHovered = hoveredGroup === g && hoveredChunkIdx === ci;
            const r = isChunkHit ? 5 : 3.5;

            /* Hit pulse */
            if (isChunkHit) {
              const pr = r + 5 + Math.sin(pulse) * 1.5;
              ctx.beginPath();
              ctx.arc(px, py, pr, 0, Math.PI * 2);
              ctx.strokeStyle = hexToRgba(col, 0.4);
              ctx.lineWidth = 1.2;
              ctx.stroke();
            }

            /* Chunk dot */
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fillStyle = hexToRgba(col, isChunkHit ? 1 : 0.6);
            ctx.fill();

            /* Chunk hover ring */
            if (isChunkHovered) {
              ctx.beginPath();
              ctx.arc(px, py, r + 4, 0, Math.PI * 2);
              ctx.strokeStyle = col;
              ctx.lineWidth = 1.3;
              ctx.stroke();
            }

            /* Chunk label */
            ctx.fillStyle = hexToRgba(col, 0.5);
            ctx.font = '8px "JetBrains Mono", monospace';
            ctx.textAlign = "center";
            ctx.fillText(`${ci + 1}`, px, py - r - 3);
          });

          /* Dimmed centroid anchor */
          ctx.beginPath();
          ctx.arc(cx, cy, 8, 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba(col, 0.25);
          ctx.fill();
          ctx.strokeStyle = hexToRgba(col, 0.5);
          ctx.lineWidth = 1.5;
          ctx.stroke();

          /* "collapse" icon in center */
          ctx.fillStyle = hexToRgba(col, 0.6);
          ctx.font = '8px "JetBrains Mono", monospace';
          ctx.textAlign = "center";
          ctx.fillText("−", cx, cy + 3);
        } else {
          /* ─── COLLAPSED: Show centroid only ─── */
          const baseR = 10;
          const r = baseR + Math.min(g.chunks.length, 10) * 0.3;

          /* Hit pulse ring */
          if (hasHit) {
            const pr = r + 6 + Math.sin(pulse) * 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, pr, 0, Math.PI * 2);
            ctx.strokeStyle = hexToRgba(col, 0.4);
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          /* Main dot */
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fillStyle = col;
          ctx.fill();

          /* Inner glow */
          ctx.beginPath();
          ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba("#1e1e2e", 0.35);
          ctx.fill();

          /* Chunk count in center */
          ctx.fillStyle = "#cdd6f4";
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(g.chunks.length), cx, cy);
          ctx.textBaseline = "alphabetic";

          /* Hover ring */
          if (isHoveredGroup) {
            ctx.beginPath();
            ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
            ctx.strokeStyle = col;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }

          /* Document name label below */
          const label = g.docName.length > 20
            ? g.docName.slice(0, 18) + "…"
            : g.docName;
          ctx.fillStyle = hexToRgba(col, 0.7);
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.textAlign = "center";
          ctx.fillText(label, cx, cy + r + 14);
        }
      }

      /* ─── Query crosshair ─── */
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
        ctx.moveTo(-16, 0); ctx.lineTo(-13, 0);
        ctx.moveTo(13, 0); ctx.lineTo(16, 0);
        ctx.moveTo(0, -16); ctx.lineTo(0, -13);
        ctx.moveTo(0, 13); ctx.lineTo(0, 16);
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

      /* ─── Set hover item for Tooltip ─── */
      if (hoveredGroup) {
        if (hoveredChunkIdx >= 0) {
          const chunk = hoveredGroup.chunks[hoveredChunkIdx];
          setHoverItem({
            type: "chunk",
            docName: hoveredGroup.docName,
            color: hoveredGroup.color,
            chunkIndex: hoveredChunkIdx + 1,
            totalChunks: hoveredGroup.chunks.length,
            title: chunk.title,
            text: chunk.text?.slice(0, 100) || "",
          });
        } else {
          setHoverItem({
            type: "document",
            docName: hoveredGroup.docName,
            color: hoveredGroup.color,
            chunkCount: hoveredGroup.chunks.length,
            isExpanded: expandedDoc === hoveredGroup.docName,
          });
        }
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
  }, [docGroups, expandedDoc, hitIds, queryPt, bounds, setHoverItem]);

  /* ─── Mouse tracking ─── */
  const handleCanvasMouseMove = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const customEvent = new CustomEvent('canvas-mousemove', {
      detail: { clientX: e.clientX, clientY: e.clientY }
    });
    window.dispatchEvent(customEvent);
  }, []);

  /* ─── Click to expand/collapse ─── */
  const handleCanvasClick = useCallback((e) => {
    if (!docGroups.length) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const W = canvasRef.current.width / (window.devicePixelRatio || 1);
    const H = canvasRef.current.height / (window.devicePixelRatio || 1);
    let { minX, maxX, minY, maxY } = bounds;
    if (queryPt) {
      minX = Math.min(minX, queryPt[0] - 0.2);
      maxX = Math.max(maxX, queryPt[0] + 0.2);
      minY = Math.min(minY, queryPt[1] - 0.2);
      maxY = Math.max(maxY, queryPt[1] + 0.2);
    }
    const P = 70;
    const w2c = (wx, wy) => {
      const rx = maxX - minX || 1;
      const ry = maxY - minY || 1;
      return [
        P + ((wx - minX) / rx) * (W - 2 * P),
        H - P - ((wy - minY) / ry) * (H - 2 * P),
      ];
    };

    for (const g of docGroups) {
      const [cx, cy] = w2c(g.centroidPt[0], g.centroidPt[1]);
      const d = Math.hypot(mx - cx, my - cy);
      if (d < 22) {
        setExpandedDoc((prev) => prev === g.docName ? null : g.docName);
        return;
      }
    }
  }, [docGroups, bounds, queryPt, setExpandedDoc]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block", cursor: "pointer" }}
      onMouseMove={handleCanvasMouseMove}
      onMouseLeave={() => setHoverItem(null)}
      onClick={handleCanvasClick}
    />
  );
}

/* ─── Helper: draw a dashed arrow between two points ─── */
function drawDashedArrow(ctx, x1, y1, x2, y2) {
  ctx.strokeStyle = "rgba(205,214,244,0.15)";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);

  const angle = Math.atan2(y2 - y1, x2 - x1);
  const rOffset = 12;
  const tipX = x2 - rOffset * Math.cos(angle);
  const tipY = y2 - rOffset * Math.sin(angle);
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
