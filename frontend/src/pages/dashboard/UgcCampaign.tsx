import { useRef, useState } from 'react';
import { C } from '../../styles/theme';
import { creativeApi, type UgcScene, type Fmt } from '../../api/creative';
import { workspaceApi } from '../../api/workspace';
import CampaignCanvas from './CampaignCanvas';

const toBase64 = (file: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });

type SceneStatus = 'idle' | 'running' | 'done' | 'error';
interface SceneRun { status: SceneStatus; imageUrl?: string; videoUrl?: string }

const SCENE_META: Record<string, { emoji: string; label: string }> = {
  hook: { emoji: '🎣', label: 'Gancho' }, message: { emoji: '💬', label: 'El mensaje' },
  build: { emoji: '⚡', label: 'Se construye' }, cta: { emoji: '🎯', label: 'CTA' },
};

// Campaña UGC por "nodos": el agente planifica 4 escenas y las genera con IA (Seedance).
export default function UgcCampaign({ costs, credits, setCredits }: { costs: Record<string, number>; credits: number; setCredits: (n: number) => void }) {
  const [name, setName] = useState('');
  const [imageBase64, setImageBase64] = useState<string | undefined>();
  const [format] = useState<Fmt>('9:16');
  const [plan, setPlan] = useState<{ creator: string; scenes: UgcScene[] } | null>(null);
  const [runs, setRuns] = useState<Record<string, SceneRun>>({});
  const [planning, setPlanning] = useState(false);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const sceneCost = costs.ugc_video_10 ?? 10;
  const totalCost = plan ? plan.scenes.length * sceneCost : 0;

  const doPlan = async () => {
    setErr(null); setPlanning(true);
    try {
      const p = await creativeApi.ugcPlan({ product: { name: name || 'Producto' } });
      setPlan(p);
      setRuns(Object.fromEntries(p.scenes.map(s => [s.key, { status: 'idle' as SceneStatus }])));
    } catch { setErr('No se pudo planificar la campaña (¿IA configurada?).'); }
    finally { setPlanning(false); }
  };

  const runAll = async () => {
    if (!plan) return;
    if (!window.confirm(`Generar la campaña completa usará ${totalCost} créditos (${plan.scenes.length} escenas × ${sceneCost}). Tenés ${credits}. ¿Continuar?`)) return;
    setRunning(true); setErr(null);
    for (const scene of plan.scenes) {
      setRuns(r => ({ ...r, [scene.key]: { ...r[scene.key], status: 'running' } }));
      try {
        const res = await creativeApi.ugcScene({ product: { name: name || 'Producto' }, scene, referenceImage: imageBase64, format });
        setCredits(res.credits);
        setRuns(r => ({ ...r, [scene.key]: { status: 'done', imageUrl: res.imageUrl, videoUrl: res.videoUrl } }));
      } catch (e: any) {
        setRuns(r => ({ ...r, [scene.key]: { ...r[scene.key], status: 'error' } }));
        setErr(e?.response?.data?.message === 'SIN_CREDITOS' ? 'Te quedaste sin créditos.' : 'Una escena falló (no se descontaron créditos de esa escena).');
        break;
      }
    }
    setRunning(false);
  };

  const doneCount = Object.values(runs).filter(r => r.status === 'done').length;
  const [saved, setSaved] = useState(false);
  const [layout, setLayout] = useState<'list' | 'canvas'>('canvas');

  const saveProject = async () => {
    if (!plan) return;
    const first = plan.scenes.map(s => runs[s.key]).find(r => r?.videoUrl || r?.imageUrl);
    try {
      await workspaceApi.createProject({
        name: `Campaña UGC — ${name || 'Producto'}`, type: 'ugc_campaign',
        thumbnailUrl: first?.videoUrl || first?.imageUrl,
        creditsUsed: doneCount * sceneCost,
        data: { product: { name }, creator: plan.creator, scenes: plan.scenes.map(s => ({ ...s, ...(runs[s.key] || {}) })) },
      });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch { setErr('No se pudo guardar el proyecto.'); }
  };

  return (
    <div style={{ padding: '28px clamp(16px,3vw,40px)', color: C.text, maxWidth: 1000, margin: '0 auto' }}>
      <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 24, margin: '0 0 4px' }}>Campaña UGC con IA</h1>
      <p style={{ color: C.textMuted, fontSize: 14, margin: '0 0 22px' }}>El agente planifica un video UGC en 4 escenas (Gancho → Mensaje → Se construye → CTA) con una persona sintética y lo genera con IA.</p>

      {/* Producto */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 20 }}>
        <div onClick={() => fileRef.current?.click()} style={{ width: 72, height: 72, borderRadius: 12, border: `1.5px dashed ${C.borderBright}`, background: C.surface, display: 'grid', placeItems: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
          {imageBase64 ? <img src={imageBase64} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 22 }}>📷</span>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={async e => e.target.files?.[0] && setImageBase64(await toBase64(e.target.files[0]))} />
        <label style={{ flex: 1, minWidth: 220 }}>
          <span style={{ fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 }}>Producto</span>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Papas GoodShow Cheddar" style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none' }} />
        </label>
        <Btn onClick={doPlan} disabled={planning || (!name && !imageBase64)}>{planning ? 'Planeando…' : plan ? 'Replanificar' : '🤖 Planificar campaña'}</Btn>
      </div>

      {err && <div style={{ background: C.redDim, border: `1px solid ${C.red}`, color: C.red, borderRadius: 10, padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>⚠️ {err}</div>}

      {/* Nodos del plan */}
      {plan && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: 13, color: C.textMuted }}>Creador: <b style={{ color: C.text }}>{plan.creator}</b> · {plan.scenes.length} escenas · <b style={{ color: C.accent }}>{totalCost} créditos</b> · {doneCount}/{plan.scenes.length} listas</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 3, background: C.surface, borderRadius: 9, padding: 3, border: `1px solid ${C.border}` }}>
                {(['canvas', 'list'] as const).map(v => (
                  <button key={v} onClick={() => setLayout(v)} style={{ padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: layout === v ? C.accent : 'transparent', color: layout === v ? '#fff' : C.textMuted }}>{v === 'canvas' ? '⬡ Canvas' : '☰ Lista'}</button>
                ))}
              </div>
              {doneCount > 0 && <button onClick={saveProject} style={{ padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid ${C.border}`, background: 'transparent', color: C.text }}>{saved ? '✓ Guardado' : '💾 Guardar proyecto'}</button>}
              {layout === 'list' && <Btn onClick={runAll} disabled={running}>{running ? 'Generando…' : `▶ Ejecutar ${plan.scenes.length} nodos`}</Btn>}
            </div>
          </div>

          {layout === 'canvas' ? (
            <CampaignCanvas plan={plan} runs={runs} running={running} onRunAll={runAll} totalCost={totalCost} />
          ) : (
            <>
              <NodeCard emoji="🧑‍🎤" title={`Personaje — ${plan.creator}`} badges={['gpt-image-2']} status="done" note="Persona sintética consistente para todas las escenas" />
              <Connector />
              {plan.scenes.map((s, i) => {
                const run = runs[s.key] ?? { status: 'idle' };
                const meta = SCENE_META[s.key] ?? { emoji: '🎬', label: s.title };
                return (
                  <div key={s.key}>
                    <NodeCard emoji={meta.emoji} title={`Escena ${i + 1} — ${s.title || meta.label}`} badges={['gpt-image-2', 'Seedance 1.5', `${s.seconds}s`]} status={run.status} note={s.script} media={run.videoUrl} />
                    {i < plan.scenes.length - 1 && <Connector />}
                  </div>
                );
              })}
              <Connector />
              <NodeCard emoji="🎞️" title="Video final (9:16)" badges={['Ensamblado', 'Subtítulos']} status={doneCount === plan.scenes.length && plan.scenes.length > 0 ? 'done' : 'idle'} note="Une las escenas + música (al terminar todas las escenas)" />
            </>
          )}
        </>
      )}
    </div>
  );
}

function NodeCard({ emoji, title, badges, status, note, media }: { emoji: string; title: string; badges: string[]; status: SceneStatus; note?: string; media?: string }) {
  const STATUS: Record<SceneStatus, { t: string; c: string }> = {
    idle: { t: 'Planificado', c: C.textMuted }, running: { t: '● Generando…', c: C.amber }, done: { t: '✓ Listo', c: C.green }, error: { t: '✕ Error', c: C.red },
  };
  const st = STATUS[status];
  return (
    <div style={{ background: C.surface, border: `1.5px solid ${status === 'running' ? C.amber : status === 'done' ? C.green : C.border}`, borderRadius: 14, padding: 14, display: 'flex', gap: 14, alignItems: 'center' }}>
      {media
        ? <video src={media} muted loop autoPlay playsInline style={{ width: 54, height: 96, objectFit: 'cover', borderRadius: 8, background: C.surface2, flexShrink: 0 }} />
        : <div style={{ width: 40, height: 40, borderRadius: 10, background: C.surface2, display: 'grid', placeItems: 'center', fontSize: 20, flexShrink: 0 }}>{emoji}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
        {note && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note}</div>}
        <div style={{ display: 'flex', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
          {badges.map(b => <span key={b} style={{ fontSize: 10, fontWeight: 600, color: C.blue, background: C.blueDim, borderRadius: 6, padding: '2px 7px' }}>{b}</span>)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {status === 'running' && <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${C.surface2}`, borderTopColor: C.amber, animation: 'ugcspin 1s linear infinite' }} />}
        <span style={{ color: st.c, fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>{st.t}</span>
        {media && <a href={media} download target="_blank" rel="noreferrer" style={{ color: C.green, fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>⬇</a>}
      </div>
      <style>{`@keyframes ugcspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Connector() { return <div style={{ width: 2, height: 16, background: C.border, margin: '0 0 0 33px' }} />; }

function Btn({ children, onClick, disabled }: any) {
  return <button onClick={onClick} disabled={disabled} style={{ padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, border: 'none', background: C.accent, color: '#fff', whiteSpace: 'nowrap' }}>{children}</button>;
}
