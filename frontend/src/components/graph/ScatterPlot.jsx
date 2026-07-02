import React, { useEffect, useRef, useCallback } from 'react';
import { useApp } from '../../contexts/AppContext';
import { COL } from '../../constants';
import { hexToRgba } from '../../utils/colors';

export default function ScatterPlot() {
  const { allItems, pcaPoints, hitIds, queryPt, bounds, setHoverItem } = useApp();
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  const catColor = (c) => COL[c] || COL.default;

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
  }, [allItems, pcaPoints, hitIds, queryPt, bounds, setHoverItem]);

  /* ─── Mouse tracking on canvas ─── */
  const handleCanvasMouseMove = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    // Tooltip position dispatch is now handled globally via mousemove on document or specific wrapper
    // We will just let the global tooltip listen to window mousemove or manage its own tracking.
    // Wait, the tooltip tracking in original App.jsx relies on tipRef.
    // To decouple, we dispatch a custom event or let the Tooltip track mouse.
    // Easiest is to fire a custom event that Tooltip component listens to, or update an internal ref.
    const customEvent = new CustomEvent('canvas-mousemove', {
      detail: { clientX: e.clientX, clientY: e.clientY }
    });
    window.dispatchEvent(customEvent);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block" }}
      onMouseMove={handleCanvasMouseMove}
      onMouseLeave={() => setHoverItem(null)}
    />
  );
}
