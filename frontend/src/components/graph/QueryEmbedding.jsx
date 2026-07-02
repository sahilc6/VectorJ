import React, { useEffect, useRef } from 'react';
import { useApp } from '../../contexts/AppContext';
import { DIMS, DIM_COL } from '../../constants';
import { hexToRgba } from '../../utils/colors';

export default function QueryEmbedding() {
  const { queryEmb } = useApp();
  const embCanvasRef = useRef(null);

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

  if (!queryEmb) return null;

  return (
    <div>
      <span className="label">QUERY EMBEDDING</span>
      <canvas ref={embCanvasRef} className="emb-canvas" />
    </div>
  );
}
