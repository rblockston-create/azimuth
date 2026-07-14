import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const CHART = '#f2ecdd';
const GRATICULE = '#d3c8b0';
const MINOR = 24;
const MAJOR = 5; // a heavy line every 5th graticule

const uid = () => Math.random().toString(36).slice(2, 11);

// ---------- geometry ----------
function bounds(shape) {
  switch (shape.kind) {
    case 'pen': {
      const xs = shape.points.filter((_, i) => i % 2 === 0);
      const ys = shape.points.filter((_, i) => i % 2 === 1);
      return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
    }
    case 'line':
    case 'arrow':
      return {
        x1: Math.min(shape.x1, shape.x2),
        y1: Math.min(shape.y1, shape.y2),
        x2: Math.max(shape.x1, shape.x2),
        y2: Math.max(shape.y1, shape.y2),
      };
    case 'rect':
    case 'ellipse':
      return {
        x1: Math.min(shape.x, shape.x + shape.w),
        y1: Math.min(shape.y, shape.y + shape.h),
        x2: Math.max(shape.x, shape.x + shape.w),
        y2: Math.max(shape.y, shape.y + shape.h),
      };
    case 'text':
      return {
        x1: shape.x,
        y1: shape.y - shape.size,
        x2: shape.x + shape.text.length * shape.size * 0.6,
        y2: shape.y + shape.size * 0.3,
      };
    default:
      return null;
  }
}

function hits(shape, x, y, slack) {
  const b = bounds(shape);
  if (!b) return false;
  return x >= b.x1 - slack && x <= b.x2 + slack && y >= b.y1 - slack && y <= b.y2 + slack;
}

// ---------- painting ----------
function paintShape(ctx, shape) {
  ctx.strokeStyle = shape.color;
  ctx.fillStyle = shape.color;
  ctx.lineWidth = shape.width || 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (shape.kind) {
    case 'pen': {
      const p = shape.points;
      if (p.length < 4) break;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      // Quadratic smoothing through midpoints keeps strokes from looking polygonal.
      for (let i = 2; i < p.length - 2; i += 2) {
        const mx = (p[i] + p[i + 2]) / 2;
        const my = (p[i + 1] + p[i + 3]) / 2;
        ctx.quadraticCurveTo(p[i], p[i + 1], mx, my);
      }
      ctx.lineTo(p[p.length - 2], p[p.length - 1]);
      ctx.stroke();
      break;
    }
    case 'line':
      ctx.beginPath();
      ctx.moveTo(shape.x1, shape.y1);
      ctx.lineTo(shape.x2, shape.y2);
      ctx.stroke();
      break;
    case 'arrow': {
      const { x1, y1, x2, y2 } = shape;
      const a = Math.atan2(y2 - y1, x2 - x1);
      const head = 8 + (shape.width || 2) * 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - head * Math.cos(a - Math.PI / 7), y2 - head * Math.sin(a - Math.PI / 7));
      ctx.lineTo(x2 - head * Math.cos(a + Math.PI / 7), y2 - head * Math.sin(a + Math.PI / 7));
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'rect':
      ctx.beginPath();
      ctx.rect(shape.x, shape.y, shape.w, shape.h);
      ctx.stroke();
      break;
    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(
        shape.x + shape.w / 2,
        shape.y + shape.h / 2,
        Math.abs(shape.w / 2),
        Math.abs(shape.h / 2),
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      break;
    case 'text':
      ctx.font = `500 ${shape.size}px "Space Grotesk", sans-serif`;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(shape.text, shape.x, shape.y);
      break;
    default:
      break;
  }
}

export default function Canvas({
  shapes,
  drafts,
  cursors,
  tool,
  color,
  width,
  view,
  setView,
  onCommit,
  onDraft,
  onErase,
  onCursor,
}) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [textEntry, setTextEntry] = useState(null);
  const [, tick] = useState(0); // forces a repaint mid-stroke without touching parent state

  const drawing = useRef(null);
  const panning = useRef(null);
  const spaceDown = useRef(false);
  const erased = useRef(new Set());

  // Keep the latest view in a ref so pointer handlers don't need to re-bind.
  const viewRef = useRef(view);
  viewRef.current = view;

  const toWorld = useCallback((sx, sy) => {
    const v = viewRef.current;
    return { x: sx / v.scale + v.x, y: sy / v.scale + v.y };
  }, []);

  // ---------- sizing ----------
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width: w, height: h } = entry.contentRect;
      setSize({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ---------- render loop ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.w || !size.h) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.w * dpr;
    canvas.height = size.h * dpr;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = CHART;
    ctx.fillRect(0, 0, size.w, size.h);

    // graticule
    const step = MINOR * view.scale;
    if (step > 6) {
      const originX = -view.x * view.scale;
      const originY = -view.y * view.scale;
      const startX = originX % step;
      const startY = originY % step;
      const firstIx = Math.round((startX - originX) / step);
      const firstIy = Math.round((startY - originY) / step);

      ctx.lineWidth = 1;
      for (let i = 0, x = startX; x <= size.w; x += step, i++) {
        const major = (firstIx + i) % MAJOR === 0;
        ctx.strokeStyle = GRATICULE;
        ctx.globalAlpha = major ? 0.75 : 0.32;
        ctx.beginPath();
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, size.h);
        ctx.stroke();
      }
      for (let i = 0, y = startY; y <= size.h; y += step, i++) {
        const major = (firstIy + i) % MAJOR === 0;
        ctx.strokeStyle = GRATICULE;
        ctx.globalAlpha = major ? 0.75 : 0.32;
        ctx.beginPath();
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(size.w, Math.round(y) + 0.5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // world space
    ctx.save();
    ctx.scale(view.scale, view.scale);
    ctx.translate(-view.x, -view.y);

    for (const s of shapes) paintShape(ctx, s);
    for (const s of Object.values(drafts)) if (s) paintShape(ctx, s);
    if (drawing.current?.shape) paintShape(ctx, drawing.current.shape);

    ctx.restore();

    // peer cursors sit above the artwork, in screen space
    for (const c of Object.values(cursors)) {
      const sx = (c.x - view.x) * view.scale;
      const sy = (c.y - view.y) * view.scale;
      if (sx < -40 || sy < -40 || sx > size.w + 40 || sy > size.h + 40) continue;

      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx, sy + 14);
      ctx.lineTo(sx + 4, sy + 10.5);
      ctx.lineTo(sx + 9.5, sy + 10.5);
      ctx.closePath();
      ctx.fill();

      ctx.font = '600 11px "JetBrains Mono", monospace';
      const label = c.name;
      const w = ctx.measureText(label).width;
      ctx.fillRect(sx + 10, sy + 8, w + 10, 17);
      ctx.fillStyle = '#0d1319';
      ctx.fillText(label, sx + 15, sy + 20);
    }
  });  // repaint on every render; strokes in progress drive this via tick()

  // ---------- keyboard ----------
  useEffect(() => {
    const down = (e) => {
      if (e.code === 'Space' && !textEntry) {
        spaceDown.current = true;
      }
    };
    const up = (e) => {
      if (e.code === 'Space') spaceDown.current = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [textEntry]);

  // ---------- zoom ----------
  const onWheel = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    setView((v) => {
      const next = Math.min(4, Math.max(0.15, v.scale * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
      // Anchor the zoom on the pointer so the point under the cursor stays put.
      return {
        scale: next,
        x: v.x + px / v.scale - px / next,
        y: v.y + py / v.scale - py / next,
      };
    });
  };

  // ---------- pointer ----------
  const onPointerDown = (e) => {
    if (textEntry) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x, y } = toWorld(sx, sy);
    canvasRef.current.setPointerCapture(e.pointerId);

    if (e.button === 1 || spaceDown.current) {
      panning.current = { sx, sy, ox: view.x, oy: view.y };
      return;
    }
    if (e.button !== 0) return;

    if (tool === 'eraser') {
      erased.current = new Set();
      drawing.current = { erasing: true };
      eraseAt(x, y);
      return;
    }

    if (tool === 'text') {
      setTextEntry({ sx, sy, x, y, value: '' });
      return;
    }

    const base = { id: uid(), color, width };
    let shape;
    if (tool === 'pen') shape = { ...base, kind: 'pen', points: [x, y] };
    else if (tool === 'line' || tool === 'arrow') shape = { ...base, kind: tool, x1: x, y1: y, x2: x, y2: y };
    else shape = { ...base, kind: tool, x, y, w: 0, h: 0 };

    drawing.current = { shape, ox: x, oy: y, lastSent: 0 };
  };

  const eraseAt = (x, y) => {
    const slack = 6 / view.scale;
    const found = shapes.filter((s) => !erased.current.has(s.id) && hits(s, x, y, slack));
    if (!found.length) return;
    found.forEach((s) => erased.current.add(s.id));
    onErase(found.map((s) => s.id));
  };

  const onPointerMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x, y } = toWorld(sx, sy);

    onCursor(x, y);

    if (panning.current) {
      const p = panning.current;
      setView((v) => ({
        ...v,
        x: p.ox - (sx - p.sx) / v.scale,
        y: p.oy - (sy - p.sy) / v.scale,
      }));
      return;
    }

    const d = drawing.current;
    if (!d) return;

    if (d.erasing) {
      eraseAt(x, y);
      return;
    }

    const s = d.shape;
    if (s.kind === 'pen') {
      s.points.push(x, y);
    } else if (s.kind === 'line' || s.kind === 'arrow') {
      s.x2 = x;
      s.y2 = y;
    } else {
      s.w = x - d.ox;
      s.h = y - d.oy;
    }

    // Throttle draft broadcasts — peers get a smooth preview without flooding the socket.
    const now = performance.now();
    if (now - d.lastSent > 40) {
      d.lastSent = now;
      onDraft(s);
    }
    tick((n) => n + 1);
  };

  const onPointerUp = () => {
    panning.current = null;
    const d = drawing.current;
    drawing.current = null;
    if (!d || d.erasing) return;

    const s = d.shape;
    const b = bounds(s);
    const tiny = b && Math.abs(b.x2 - b.x1) < 2 && Math.abs(b.y2 - b.y1) < 2;
    if (s.kind === 'pen' ? s.points.length < 4 : tiny) {
      onDraft(null);
      tick((n) => n + 1);
      return;
    }
    onCommit(s);
    onDraft(null);
  };

  const commitText = () => {
    const t = textEntry;
    setTextEntry(null);
    if (!t?.value.trim()) return;
    onCommit({
      id: uid(),
      kind: 'text',
      x: t.x,
      y: t.y,
      text: t.value.trim(),
      color,
      size: 14 + width * 3,
    });
  };

  const cursor = panning.current || spaceDown.current ? 'grabbing' : tool === 'text' ? 'text' : 'crosshair';

  return (
    <div ref={wrapRef} style={{ position: 'absolute', inset: 0 }}>
      <canvas
        ref={canvasRef}
        style={{ cursor }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => onCursor(null)}
      />
      {textEntry && (
        <input
          className="text-entry"
          autoFocus
          style={{
            left: textEntry.sx,
            top: textEntry.sy - (14 + width * 3) * view.scale,
            fontSize: (14 + width * 3) * view.scale,
            color,
          }}
          value={textEntry.value}
          onChange={(e) => setTextEntry({ ...textEntry, value: e.target.value })}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitText();
            if (e.key === 'Escape') setTextEntry(null);
          }}
        />
      )}
    </div>
  );
}
