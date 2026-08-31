import { useRef, useState } from 'react';
import { C } from '../../styles/theme';
import type { UgcScene } from '../../api/creative';

type SceneStatus = 'idle' | 'running' | 'done' | 'error';
interface SceneRun { status: SceneStatus; imageUrl?: string; videoUrl?: string }

type GroupKey = 'aporte' | 'generacion' | 'produccion';
interface GNode { id: string; x: number; y: number; group: GroupKey; emoji: string; title: string; sub?: string; badges: string[]; status: SceneStatus; media?: string; poster?: string; scene?: UgcScene }

const W = 184, H = 118;
const GROUPS: { key: GroupKey; label: string; color: string }[] = [
  { key: 'aporte', label: 'Aporte', color: '#4da6ff' },
  { key: 'generacion', label: 'Generación', color: '#7c5cfc' },
  { key: 'produccion', label: 'Producción', color: '#00d68f' },
];

// Canvas de flujo: grupos (Aporte→Generación→Producción), nodos con media, minimapa y Copiloto (externo).
export default function CampaignCanvas({ plan, runs, running, onRunAll, totalCost, onAddScene, onDeleteScene, finalVideoUrl, assembling, onAssemble, productImage }: {
  plan: { creator: string; scenes: UgcScene[] };
  runs: Record<string, SceneRun>;
  running: boolean;
  onRunAll: () => void;
  totalCost: number;
  onAddScene: () => void;
  onDeleteScene: (key: string) => void;
  finalVideoUrl?: string;
  assembling?: boolean;
  onAssemble?: () => void;
  productImage?: string;
}) {
  const [zoom, setZoom] = useState(0.7);
  const [pan, setPan] = useState({ x: 30, y: 20 });
  const [sel, setSel] = useState<GNode | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const doneCount = plan.scenes.filter(s => runs[s.key]?.status === 'done').length;

  // Layout en 3 columnas por grupo
  const nodes: GNode[] = [];
  nodes.push({ id: 'char', x: 40, y: 40, group: 'aporte', emoji: '🧑‍🎤', title: 'Persona', sub: plan.creator, badges: ['gpt-image-2'], status: 'done', poster: productImage });
  nodes.push({ id: 'product', x: 40, y: 200, group: 'aporte', emoji: '📦', title: 'Producto', sub: 'Referencia', badges: ['imagen'], status: 'done', poster: productImage });
  plan.scenes.forEach((s, i) => {
    const run = runs[s.key] ?? { status: 'idle' as SceneStatus };
    nodes.push({ id: s.key, x: 360, y: 40 + i * 150, group: 'generacion', emoji: ['🎣', '💬', '⚡', '🎯'][i] ?? '🎬', title: `Escena ${i + 1} — ${s.title}`, sub: `${s.seconds}s`, badges: ['gpt-image-2', 'Seedance 1.5'], status: run.status, media: run.videoUrl, scene: s });
  });
  const finalDone = doneCount === plan.scenes.length && plan.scenes.length > 0;
  const cy = 40 + Math.max(0, (plan.scenes.length - 1) * 150) / 2;
  nodes.push({ id: 'final', x: 700, y: cy, group: 'produccion', emoji: '🎞️', title: 'Video final', sub: '9:16 · subtítulos', badges: ['Ensamblado'], status: finalVideoUrl ? 'done' : assembling ? 'running' : finalDone ? 'idle' : 'idle', media: finalVideoUrl });

  const byId = (id: string) => nodes.find(n => n.id === id)!;
  const edges: [string, string][] = [];
  plan.scenes.forEach(s => { edges.push(['char', s.key]); edges.push(['product', s.key]); edges.push([s.key, 'final']); });

  // Rects de grupo calculados de sus nodos
  const groupRects = GROUPS.map(g => {
    const ns = nodes.filter(n => n.group === g.key);
    const minX = Math.min(...ns.map(n => n.x)) - 18, minY = Math.min(...ns.map(n => n.y)) - 34;
    const maxX = Math.max(...ns.map(n => n.x + W)) + 18, maxY = Math.max(...ns.map(n => n.y + H)) + 18;
    return { ...g, x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  });

  const path = (a: GNode, b: GNode) => {
    const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2, mx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  };
  const onDown = (e: React.MouseEvent) => { drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; };
  const onMove = (e: React.MouseEvent) => { if (drag.current) setPan({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) }); };
  const onUp = () => { drag.current = null; };

  const worldW = 940, worldH = Math.max(560, 40 + plan.scenes.length * 150 + 140);

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 150px)', minHeight: 480, borderRadius: 16, border: `1px solid ${C.border}`, background: `radial-gradient(circle at 1px 1px, #1c1c2e 1px, transparent 0) 0 0/24px 24px, #0a0a14`, overflow: 'hidden' }}>
      {/* Toolbar superior */}
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
        <div style={{ background: '#0f0f1a', border: `1px solid ${C.border}`, borderRadius: 10, padding: '6px 12px', fontSize: 12, color: C.textMuted, pointerEvents: 'auto' }}>
          Flujo · <b style={{ color: C.text }}>{nodes.length} nodos</b> · {doneCount}/{plan.scenes.length} escenas · <b style={{ color: C.accent }}>{totalCost} créditos</b>
        </div>
        <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
          <button onClick={() => onAddScene()} style={tbtn}>+ Nodo</button>
          {finalDone && !finalVideoUrl && onAssemble && <button onClick={onAssemble} disabled={assembling} style={{ ...tbtn, background: C.gradGreen, color: '#04140d', border: 'none', fontWeight: 700 }}>{assembling ? 'Ensamblando…' : '🎬 Ensamblar'}</button>}
          <button onClick={onRunAll} disabled={running} style={{ ...tbtn, background: C.accent, color: '#fff', border: 'none', fontWeight: 700 }}>{running ? 'Ejecutando…' : '▶ Ejecutar todo'}</button>
        </div>
      </div>

      {/* Lienzo */}
      <div onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} style={{ position: 'absolute', inset: 0, cursor: drag.current ? 'grabbing' : 'grab' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
          {/* Grupos */}
          {groupRects.map(g => (
            <div key={g.key} style={{ position: 'absolute', left: g.x, top: g.y, width: g.w, height: g.h, borderRadius: 18, border: `1.5px solid ${g.color}44`, background: `${g.color}0d` }}>
              <div style={{ position: 'absolute', top: 8, left: 12, fontSize: 12, fontWeight: 700, color: g.color, textTransform: 'uppercase', letterSpacing: 0.8 }}>● {g.label}</div>
            </div>
          ))}
          {/* Edges */}
          <svg width={worldW} height={worldH} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}>
            {edges.map(([a, b], i) => <path key={i} d={path(byId(a), byId(b))} fill="none" stroke={byId(b).status === 'done' ? C.green : byId(b).status === 'running' ? C.amber : '#3a3a5e'} strokeWidth={2} opacity={0.85} />)}
          </svg>
          {nodes.map(n => <Node key={n.id} n={n} onClick={() => setSel(n)} selected={sel?.id === n.id} />)}
        </div>
      </div>

      {/* Minimapa */}
      <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 4, width: 150, height: 96, borderRadius: 10, border: `1px solid ${C.border}`, background: '#0f0f1a', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${worldW} ${worldH}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid meet">
          {groupRects.map(g => <rect key={g.key} x={g.x} y={g.y} width={g.w} height={g.h} rx={20} fill={`${g.color}18`} stroke={`${g.color}55`} strokeWidth={3} />)}
          {nodes.map(n => <rect key={n.id} x={n.x} y={n.y} width={W} height={H} rx={12} fill={n.status === 'done' ? C.green : n.status === 'running' ? C.amber : '#4a4a6e'} />)}
        </svg>
      </div>

      {/* Zoom */}
      <div style={{ position: 'absolute', bottom: 12, left: 172, zIndex: 4, display: 'flex', gap: 4, background: '#0f0f1a', border: `1px solid ${C.border}`, borderRadius: 10, padding: 4 }}>
        <ZBtn onClick={() => setZoom(z => Math.max(0.3, +(z - 0.1).toFixed(2)))}>−</ZBtn>
        <span style={{ fontSize: 12, color: C.textMuted, alignSelf: 'center', minWidth: 38, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <ZBtn onClick={() => setZoom(z => Math.min(1.4, +(z + 0.1).toFixed(2)))}>+</ZBtn>
        <ZBtn onClick={() => { setZoom(0.7); setPan({ x: 30, y: 20 }); }}>⤢</ZBtn>
      </div>

      {/* Panel del nodo */}
      {sel && (
        <div style={{ position: 'absolute', top: 54, right: 12, bottom: 12, width: 300, zIndex: 5, background: '#0f0f1a', border: `1px solid ${C.borderBright}`, borderRadius: 14, padding: 16, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{sel.emoji} {sel.title}</div>
            <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {sel.badges.map(b => <span key={b} style={{ fontSize: 10, fontWeight: 600, color: C.blue, background: C.blueDim, borderRadius: 6, padding: '2px 7px' }}>{b}</span>)}
          </div>
          {sel.media && <video src={sel.media} controls loop style={{ width: '100%', borderRadius: 10, marginBottom: 12, background: C.surface2 }} />}
          {sel.scene && (
            <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 8px' }}><b style={{ color: C.text }}>Guion:</b> {sel.scene.script}</p>
              <p style={{ margin: '0 0 8px', fontSize: 12 }}><b style={{ color: C.text }}>Escena:</b> {sel.scene.imagePrompt}</p>
              <p style={{ margin: '0 0 14px', fontSize: 12 }}><b style={{ color: C.text }}>Movimiento:</b> {sel.scene.videoPrompt}</p>
              <button onClick={() => { onDeleteScene(sel.scene!.key); setSel(null); }} style={{ background: 'transparent', border: `1px solid ${C.red}`, color: C.red, borderRadius: 9, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🗑 Borrar nodo</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Node({ n, onClick, selected }: { n: GNode; onClick: () => void; selected: boolean }) {
  const border = selected ? C.accent : n.status === 'running' ? C.amber : n.status === 'done' ? C.green : '#2a2a44';
  const STt: Record<SceneStatus, string> = { idle: 'Planificado', running: '● Generando', done: '✓ Listo', error: '✕ Error' };
  const STc: Record<SceneStatus, string> = { idle: C.textMuted, running: C.amber, done: C.green, error: C.red };
  return (
    <div onMouseDown={e => e.stopPropagation()} onClick={onClick} style={{ position: 'absolute', left: n.x, top: n.y, width: W, height: H, background: '#12122a', border: `2px solid ${border}`, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', boxShadow: selected ? `0 0 0 3px ${C.accentDim}` : '0 8px 20px -12px #000', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 9px', borderBottom: `1px solid #ffffff10` }}>
        <span style={{ fontSize: 14 }}>{n.emoji}</span>
        <span style={{ fontWeight: 700, fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{n.title}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: STc[n.status] }}>{STt[n.status]}</span>
      </div>
      <div style={{ flex: 1, background: '#080814', position: 'relative', display: 'grid', placeItems: 'center' }}>
        {n.media ? <video src={n.media} muted loop autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : n.poster ? <img src={n.poster} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: 26, opacity: 0.5 }}>{n.emoji}</span>}
        <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {n.badges.slice(0, 2).map(b => <span key={b} style={{ fontSize: 8.5, fontWeight: 600, color: '#cfe0ff', background: '#000a', borderRadius: 5, padding: '1px 5px' }}>{b}</span>)}
        </div>
      </div>
    </div>
  );
}

function ZBtn({ children, onClick }: any) {
  return <button onClick={onClick} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: C.text, cursor: 'pointer', fontSize: 16 }}>{children}</button>;
}
const tbtn: React.CSSProperties = { background: '#12122a', color: C.text, border: `1px solid ${C.borderBright}`, borderRadius: 10, padding: '8px 13px', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' };
