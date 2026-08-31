import { useEffect, useRef, useState } from 'react';
import { C } from '../../styles/theme';
import { Spinner } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { workspaceApi, type BrandProduct, type Brand as BrandT } from '../../api/workspace';
import { creativeApi } from '../../api/creative';

const VOICES = [
  { key: 'fem_natural', label: 'Femenina — Natural', emoji: '🗣️' },
  { key: 'fem_energetica', label: 'Femenina — Enérgica', emoji: '⚡' },
  { key: 'masc_natural', label: 'Masculina — Natural', emoji: '🗣️' },
  { key: 'masc_pro', label: 'Masculina — Profesional', emoji: '💼' },
  { key: 'joven', label: 'Joven — Casual', emoji: '😎' },
];

const toBase64 = (f: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f); });
type Tab = 'overview' | 'products' | 'avatars' | 'voices' | 'assets' | 'kit';

export default function Brand() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [brand, setBrand] = useState<BrandT>({});
  const [products, setProducts] = useState<BrandProduct[] | null>(null);
  const [stats, setStats] = useState<{ projects: number; products: number; credits_used: number } | null>(null);

  const load = () => {
    workspaceApi.getBrand().then(setBrand).catch(() => {});
    workspaceApi.listProducts().then(setProducts).catch(() => setProducts([]));
    workspaceApi.stats().then(setStats).catch(() => {});
  };
  useEffect(load, []);

  const TABS: [Tab, string][] = [['overview', 'Descripción general'], ['products', 'Productos'], ['avatars', 'Avatares'], ['voices', 'Voces'], ['assets', 'Biblioteca de activos'], ['kit', 'Kit de marca']];

  return (
    <div style={{ padding: '28px clamp(16px,3vw,40px)', color: C.text }}>
      {/* Header */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: brand.primary_color || C.accent, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 22, color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
          {brand.logo_url ? <img src={brand.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (user?.fullName ?? 'A')[0]}
        </div>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22 }}>{brand.brand_name || `Espacio de marca de ${user?.fullName ?? ''}`}</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>👤 1 miembro del equipo</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 22 }}>
        {[['Productos', stats?.products ?? 0], ['Proyectos', stats?.projects ?? 0], ['Créditos usados', stats?.credits_used ?? 0], ['Avatares', 0], ['Voces', 0]].map(([l, v]) => (
          <div key={l} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 24 }}>{v}</div>
            <div style={{ fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.border}`, marginBottom: 22, overflowX: 'auto' }}>
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: '10px 14px', border: 'none', borderBottom: `2px solid ${tab === k ? C.accent : 'transparent'}`, background: 'transparent', color: tab === k ? C.text : C.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{l}</button>
        ))}
      </div>

      {(tab === 'overview' || tab === 'products') && <Products products={products} reload={load} />}
      {tab === 'kit' && <Kit brand={brand} onSaved={setBrand} />}
      {tab === 'avatars' && <Avatars brand={brand} onSaved={setBrand} />}
      {tab === 'voices' && <Voices brand={brand} onSaved={setBrand} />}
      {tab === 'assets' && <Assets />}
    </div>
  );
}

function Products({ products, reload }: { products: BrandProduct[] | null; reload: () => void }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<{ name: string; price: string; description: string; image?: string }>({ name: '', price: '', description: '' });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    try { await workspaceApi.addProduct(form); setForm({ name: '', price: '', description: '' }); setAdding(false); reload(); }
    finally { setBusy(false); }
  };
  const del = async (id: string) => { await workspaceApi.removeProduct(id).catch(() => {}); reload(); };

  if (!products) return <Spinner size={22} />;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 17, margin: 0 }}>Productos</h3>
        <button onClick={() => setAdding(v => !v)} style={btnP}>{adding ? 'Cerrar' : '+ Agregar producto'}</button>
      </div>

      {adding && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 16, display: 'grid', gridTemplateColumns: '100px 1fr', gap: 14 }} className="prod-grid">
          <div onClick={() => fileRef.current?.click()} style={{ aspectRatio: '1', borderRadius: 10, border: `1.5px dashed ${C.borderBright}`, background: C.surface2, display: 'grid', placeItems: 'center', cursor: 'pointer', overflow: 'hidden' }}>
            {form.image ? <img src={form.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 22 }}>📷</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={async e => { const file = e.target.files?.[0]; if (file) { const image = await toBase64(file); setForm(f => ({ ...f, image })); } }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre del producto" style={inp} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="Precio" style={inp} />
            </div>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descripción / beneficios" style={{ ...inp, minHeight: 56, resize: 'vertical' }} />
            <div><button onClick={save} disabled={busy || !form.name.trim()} style={{ ...btnP, opacity: busy || !form.name.trim() ? 0.5 : 1 }}>{busy ? 'Guardando…' : 'Guardar producto'}</button></div>
          </div>
        </div>
      )}

      {products.length === 0 && !adding ? (
        <div style={{ padding: 50, textAlign: 'center', color: C.textMuted, border: `1.5px dashed ${C.border}`, borderRadius: 14, background: C.surface }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>🛍️</div>
          <div style={{ fontWeight: 700, color: C.text, marginBottom: 4 }}>Aún no hay productos</div>
          <div style={{ fontSize: 13 }}>Agregá tu primer producto para generar anuncios más rápido.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14 }}>
          {products.map(p => (
            <div key={p.id} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, background: C.surface }}>
              <div style={{ aspectRatio: '1', background: C.surface2 }}>
                {p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: C.textDim, fontSize: 26 }}>📦</div>}
              </div>
              <div style={{ padding: 11 }}>
                <div style={{ fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                {p.price && <div style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>{p.price}</div>}
                <button onClick={() => del(p.id)} style={{ marginTop: 8, background: 'transparent', border: `1px solid ${C.border}`, color: C.textMuted, borderRadius: 8, padding: '5px 9px', fontSize: 12, cursor: 'pointer' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Kit({ brand, onSaved }: { brand: BrandT; onSaved: (b: BrandT) => void }) {
  const [name, setName] = useState(brand.brand_name ?? '');
  const [color, setColor] = useState(brand.primary_color ?? '#7c5cfc');
  const [logo, setLogo] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const save = async () => {
    setBusy(true);
    try { const b = await workspaceApi.saveBrand({ brandName: name, primaryColor: color, logo }); onSaved(b); }
    finally { setBusy(false); }
  };
  return (
    <div style={{ maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 17, margin: 0 }}>Kit de marca</h3>
      <label><span style={lbl}>Nombre de la marca</span><input value={name} onChange={e => setName(e.target.value)} placeholder="Conversia" style={inp} /></label>
      <label><span style={lbl}>Color principal</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 44, height: 38, border: 'none', background: 'none', cursor: 'pointer' }} />
          <input value={color} onChange={e => setColor(e.target.value)} style={{ ...inp, flex: 1 }} />
        </div>
      </label>
      <label><span style={lbl}>Logo</span>
        <div onClick={() => fileRef.current?.click()} style={{ width: 80, height: 80, borderRadius: 12, border: `1.5px dashed ${C.borderBright}`, background: C.surface2, display: 'grid', placeItems: 'center', cursor: 'pointer', overflow: 'hidden' }}>
          {logo ? <img src={logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : brand.logo_url ? <img src={brand.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 22 }}>🖼️</span>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={async e => e.target.files?.[0] && setLogo(await toBase64(e.target.files[0]))} />
      </label>
      <div><button onClick={save} disabled={busy} style={{ ...btnP, opacity: busy ? 0.5 : 1 }}>{busy ? 'Guardando…' : 'Guardar marca'}</button></div>
    </div>
  );
}

function Avatars({ brand, onSaved }: { brand: BrandT; onSaved: (b: BrandT) => void }) {
  const [creators, setCreators] = useState<any[] | null>(null);
  const [sel, setSel] = useState<string | undefined>(brand.data?.preferredCreator);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(brand.data?.avatarUrl);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { creativeApi.creators().then(r => setCreators(r.creators)).catch(() => setCreators([])); }, []);
  const pick = async (key: string) => {
    setSel(key); setBusy(true);
    try { const b = await workspaceApi.saveBrand({ data: { ...(brand.data || {}), preferredCreator: key } }); onSaved(b); } finally { setBusy(false); }
  };
  const uploadAvatar = async (file: File) => {
    setBusy(true);
    try { const b = await workspaceApi.saveBrand({ avatar: await toBase64(file), data: { ...(brand.data || {}), preferredCreator: 'custom' } }); onSaved(b); setAvatarUrl(b.data?.avatarUrl); setSel('custom'); } finally { setBusy(false); }
  };
  if (!creators) return <Spinner size={22} />;
  return (
    <div>
      <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 17, margin: '0 0 4px' }}>Avatares (creadores IA)</h3>
      <p style={{ color: C.textMuted, fontSize: 13, margin: '0 0 16px' }}>Personas sintéticas para tus videos UGC, o subí tu propio avatar. La Campaña UGC usa el elegido.{busy && ' · guardando…'}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
        {/* Mi avatar (foto propia) */}
        <div style={{ padding: 16, borderRadius: 14, background: sel === 'custom' ? C.accentDim : C.surface, border: `2px solid ${sel === 'custom' ? C.accent : C.border}` }}>
          <div onClick={() => avatarUrl ? pick('custom') : fileRef.current?.click()} style={{ width: 60, height: 60, borderRadius: 12, background: C.surface2, display: 'grid', placeItems: 'center', cursor: 'pointer', overflow: 'hidden', marginBottom: 8 }}>
            {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 26 }}>➕</span>}
          </div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Mi avatar {sel === 'custom' && <span style={{ color: C.accent }}>✓</span>}</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>Tu propia foto</div>
          <button onClick={() => fileRef.current?.click()} style={{ ...btnP, padding: '5px 10px', fontSize: 12, marginTop: 8 }}>{avatarUrl ? 'Cambiar' : 'Subir'}</button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
        </div>
        {creators.map(c => {
          const on = sel === c.key;
          return (
            <button key={c.key} onClick={() => pick(c.key)} style={{ textAlign: 'left', padding: 16, borderRadius: 14, cursor: 'pointer', background: on ? C.accentDim : C.surface, border: `2px solid ${on ? C.accent : C.border}` }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>🧑‍🎤</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name} {on && <span style={{ color: C.accent }}>✓</span>}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{c.description}</div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 6 }}>{c.ageRange} · {c.tone}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Voices({ brand, onSaved }: { brand: BrandT; onSaved: (b: BrandT) => void }) {
  const [sel, setSel] = useState<string | undefined>(brand.data?.voice);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const pick = async (key: string) => {
    setSel(key); setBusy(true);
    try { const b = await workspaceApi.saveBrand({ data: { ...(brand.data || {}), voice: key } }); onSaved(b); } finally { setBusy(false); }
  };
  const play = async (key: string) => {
    setPlaying(key);
    try {
      const { audioUrl } = await creativeApi.tts('Hola! Esto es una muestra de la voz para tus anuncios con IA.', key);
      const a = new Audio(audioUrl); a.onended = () => setPlaying(null); await a.play();
    } catch { setPlaying(null); alert('La voz necesita OpenAI configurado.'); }
  };
  return (
    <div>
      <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 17, margin: '0 0 4px' }}>Voces</h3>
      <p style={{ color: C.textMuted, fontSize: 13, margin: '0 0 16px' }}>Elegí el estilo de voz para la narración de tus videos.{busy && ' · guardando…'}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
        {VOICES.map(v => {
          const on = sel === v.key;
          return (
            <div key={v.key} style={{ padding: 16, borderRadius: 14, background: on ? C.accentDim : C.surface, border: `2px solid ${on ? C.accent : C.border}` }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{v.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{v.label} {on && <span style={{ color: C.accent }}>✓</span>}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => pick(v.key)} style={{ ...btnP, padding: '6px 12px', fontSize: 12, flex: 1 }}>{on ? 'Elegida' : 'Elegir'}</button>
                <button onClick={() => play(v.key)} disabled={playing === v.key} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.text, borderRadius: 9, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>{playing === v.key ? '♪…' : '▶'}</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Assets() {
  const [items, setItems] = useState<any[] | null>(null);
  useEffect(() => { creativeApi.list().then(setItems).catch(() => setItems([])); }, []);
  if (!items) return <Spinner size={22} />;
  if (!items.length) return <Empty emoji="🗂️" title="Biblioteca de activos" text="Tus imágenes y videos generados aparecerán acá. Creá tu primer creativo en Creativos IA." />;
  return (
    <div>
      <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 17, margin: '0 0 14px' }}>Biblioteca de activos <span style={{ color: C.textMuted, fontWeight: 400 }}>· {items.length}</span></h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 }}>
        {items.map(it => (
          <div key={it.id} style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.border}`, background: C.surface }}>
            <div style={{ aspectRatio: '3/4', background: C.surface2 }}>
              {it.video_url ? <video src={it.video_url} muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : it.output_url ? <img src={it.output_url} alt={it.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: C.textDim }}>🎨</div>}
            </div>
            <div style={{ padding: 10, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <div style={{ padding: 60, textAlign: 'center', color: C.textMuted, border: `1.5px dashed ${C.border}`, borderRadius: 14, background: C.surface }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>{emoji}</div>
      <div style={{ fontWeight: 700, color: C.text, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 14, maxWidth: 440, margin: '0 auto' }}>{text}</div>
    </div>
  );
}

const inp: React.CSSProperties = { width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit' };
const lbl: React.CSSProperties = { fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 5 };
const btnP: React.CSSProperties = { background: C.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' };
