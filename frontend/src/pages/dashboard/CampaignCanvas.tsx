import { useRef, useState } from 'react';
import { C } from '../../styles/theme';
import type { UgcScene } from '../../api/creative';

type SceneStatus = 'idle' | 'running' | 'done' | 'error';
interface SceneRun { status: SceneStatus; imageUrl?: string; videoUrl?: string }

interface GNode { id: string; x: number; y: number; emoji: string; title: string; badges: string[]; status: SceneStatus; media?: string; scene?: UgcScene }

const W = 236, H = 104;

// Editor de flujo (canvas de nodos) para la campaña UGC: personaje → escenas → video final.
export default function CampaignCanvas({ plan, runs, running, onRunAll, totalCost }: {
  plan: { creator: string; scenes: UgcScene[] };
  runs: Record<string, SceneRun>;
  running: boolean;
  onRunAll: () => void;
  totalCost: number;
}) {
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState({ x: 20, y: 10 });
  const [sel, setSel] = useState<GNode | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const doneCount = plan.scenes.filter(s => runs[s.key]?.status === 'done').length;

  // Layout: personaje (izq) → escenas (columna) → video final (der, fan-in)
  const nodes: GNode[] = [];
  nodes.push({ id: 'char', x: 30, y: 220, emoji: '🧑‍🎤', title: `Personaje — ${plan.creator}`, badges: ['gpt-image-2'], status: 'done' });
  plan.scenes.forEach((s, i) => {
    const run = runs[s.key] ?? { status: 'idle' as SceneStatus };
    nodes.push({ id: s.key, x: 330, y: 20 + i * 140, emoji: ['🎣', '💬', '⚡', '🎯'][i] ?? '🎬', title: `Escena ${i + 1} — ${s.title}`, badges: ['gpt-image-2', 'Seedance 1.5', `${s.seconds}s`], status: run.status, media: run.videoUrl, scene: s });
  });
  const finalDone = doneCount === plan.scenes.length && plan.scenes.length > 0;
  nodes.push({ id: 'final', x: 640, y: 220, emoji: '🎞️', title: 'Video final (9:16)', badges: ['Ensamblado', 'Subtítulos'], status: finalDone ? 'done' : 'idle' });

  const byId = (id: string) => nodes.find(n => n.id === id)!;
  const edges: [string, string][] = [];
  plan.scenes.forEach(s => { edges.push(['char', s.key]); edges.push([s.key, 'final']); });

  const path = (a: GNode, b: GNode) => {
    const x1 = a.x + W, y1 = a.y + H / 2, x2 = b.x, y2 = b.y + H / 2;
    const mx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  };

  const onDown = (e: React.MouseEvent) => { drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; };
  const onMove = (e: React.MouseEvent) => { if (drag.current) setPan({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) }); };
  const onUp = () => { drag.current = null; };

  return (
    <div style={{ position: 'relative', height: 'calc(100vh - 210px)', minHeight: 420, borderRadius: 16, border: `1px solid ${C.border}`, background: `radial-gradient(circle at 1px 1px, ${C.border} 1px, transparent 0) 0 0/22px 22px, ${C.bg}`, overflow: 'hidden' }}>
      {/* Barra superior */}
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '6px 12px', fontSize: 12, color: C.textMuted, pointerEvents: 'auto' }}>
          {nodes.length} nodos · <b style={{ color: C.text }}>{doneCount}/{plan.scenes.length}</b> escenas · <b style={{ color: C.accent }}>{totalCost} créditos</b>
        </div>
        <button onClick={onRunAll} disabled={running} style={{ pointerEvents: 'auto', background: C.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: running ? 'wait' : 'pointer', opacity: running ? 0.6 : 1 }}>{running ? 'Ejecutando…' : `▶ Ejecutar todo (${nodes.length} nodos)`}</button>
      </div>

      {/* Lienzo */}
      <div onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp} style={{ position: 'absolute', inset: 0, cursor: drag.current ? 'grabbing' : 'grab' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
          <svg width={950} height={640} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}>
            {edges.map(([a, b], i) => <path key={i} d={path(byId(a), byId(b))} fill="none" stroke={byId(b).status === 'done' ? C.green : byId(b).status === 'running' ? C.amber : C.borderBright} strokeWidth={2} opacity={0.8} />)}
          </svg>
          {nodes.map(n => <Node key={n.id} n={n} onClick={() => setSel(n)} selected={sel?.id === n.id} />)}
        </div>
      </div>

      {/* Zoom */}
      <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 3, display: 'flex', gap: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4 }}>
        <ZBtn onClick={() => setZoom(z => Math.max(0.4, +(z - 0.1).toFixed(2)))}>−</ZBtn>
        <span style={{ fontSize: 12, color: C.textMuted, alignSelf: 'center', minWidth: 38, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
        <ZBtn onClick={() => setZoom(z => Math.min(1.6, +(z + 0.1).toFixed(2)))}>+</ZBtn>
        <ZBtn onClick={() => { setZoom(0.85); setPan({ x: 20, y: 10 }); }}>⤢</ZBtn>
      </div>

      {/* Panel del nodo */}
      {sel && (
        <div style={{ position: 'absolute', top: 56, right: 12, bottom: 12, width: 300, zIndex: 4, background: C.surface, border: `1px solid ${C.borderBright}`, borderRadius: 14, padding: 16, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
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
              <p style={{ margin: 0, fontSize: 12 }}><b style={{ color: C.text }}>Movimiento:</b> {sel.scene.videoPrompt}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Node({ n, onClick, selected }: { n: GNode; onClick: () => void; selected: boolean }) {
  const border = selected ? C.accent : n.status === 'running' ? C.amber : n.status === 'done' ? C.green : C.border;
  const STt: Record<SceneStatus, string> = { idle: 'Planificado', running: '● Generando', done: '✓ Listo', error: '✕ Error' };
  const STc: Record<SceneStatus, string> = { idle: C.textMuted, running: C.amber, done: C.green, error: C.red };
  return (
    <div onMouseDown={e => e.stopPropagation()} onClick={onClick} style={{ position: 'absolute', left: n.x, top: n.y, width: W, minHeight: H, background: C.surface, border: `2px solid ${border}`, borderRadius: 12, padding: 12, cursor: 'pointer', boxShadow: selected ? `0 0 0 3px ${C.accentDim}` : 'none' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {n.media
          ? <video src={n.media} muted loop autoPlay playsInline style={{ width: 34, height: 60, objectFit: 'cover', borderRadius: 6, background: C.surface2 }} />
          : <div style={{ width: 34, height: 34, borderRadius: 8, background: C.surface2, display: 'grid', placeItems: 'center', fontSize: 18 }}>{n.emoji}</div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: STc[n.status], marginTop: 2 }}>{STt[n.status]}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
        {n.badges.map(b => <span key={b} style={{ fontSize: 9, fontWeight: 600, color: C.blue, background: C.blueDim, borderRadius: 5, padding: '1px 6px' }}>{b}</span>)}
      </div>
    </div>
  );
}

function ZBtn({ children, onClick }: any) {
  return <button onClick={onClick} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'transparent', color: C.text, cursor: 'pointer', fontSize: 16 }}>{children}</button>;
}
