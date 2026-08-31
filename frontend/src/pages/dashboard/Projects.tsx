import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { C } from '../../styles/theme';
import { Spinner } from '../../components/ui';
import { workspaceApi, type Project } from '../../api/workspace';

const TYPE_LABEL: Record<string, string> = { ugc_campaign: 'Campaña UGC', creative: 'Creativo', image: 'Imagen', video: 'Video' };

export default function Projects() {
  const nav = useNavigate();
  const [items, setItems] = useState<Project[] | null>(null);
  const [q, setQ] = useState('');
  const load = () => workspaceApi.listProjects().then(setItems).catch(() => setItems([]));
  useEffect(() => { load(); }, []);
  const del = async (id: string) => { await workspaceApi.removeProject(id).catch(() => {}); load(); };

  if (!items) return <div style={{ padding: 40 }}><Spinner size={24} /></div>;
  const shown = items.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{ padding: '28px clamp(16px,3vw,40px)', color: C.text }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, margin: 0 }}>Proyectos</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre…" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', color: C.text, fontSize: 13, outline: 'none', minWidth: 200 }} />
          <button onClick={() => nav('/dashboard/creatives')} style={btn}>+ Agregar nuevo</button>
        </div>
      </div>

      {shown.length === 0 ? (
        <div style={{ padding: 70, textAlign: 'center', color: C.textMuted, border: `1.5px dashed ${C.border}`, borderRadius: 16, background: C.surface }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>📁</div>
          <div style={{ fontWeight: 700, color: C.text, marginBottom: 4 }}>Todavía no tenés proyectos</div>
          <div style={{ fontSize: 14, marginBottom: 16 }}>Creá tu primera campaña con IA y guardala como proyecto.</div>
          <button onClick={() => nav('/dashboard/creatives')} style={btn}>Crear campaña</button>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 14 }}>Archivos <b style={{ color: C.text }}>{shown.length}</b></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 16 }}>
            {shown.map(p => (
              <div key={p.id} className="cv-card cv-thumb" style={{ overflow: 'hidden', padding: 0 }}>
                <div onClick={() => nav('/dashboard/creatives')} style={{ aspectRatio: '16/10', background: C.surface2, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  {p.thumbnail_url
                    ? (/\.mp4|video/.test(p.thumbnail_url) ? <video src={p.thumbnail_url} muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <img src={p.thumbnail_url} alt={p.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />)
                    : <span style={{ fontSize: 30, color: C.textDim }}>🎬</span>}
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, margin: '4px 0 8px', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ background: C.accentDim, color: C.accent, borderRadius: 6, padding: '2px 7px', fontWeight: 600 }}>{TYPE_LABEL[p.type] ?? p.type}</span>
                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                    <span>· ⚡{p.credits_used}</span>
                  </div>
                  <button onClick={() => del(p.id)} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>🗑️ Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const btn: React.CSSProperties = { background: C.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' };
