import { useEffect, useRef, useState } from 'react';
import { C } from '../../styles/theme';
import { Spinner } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { workspaceApi, type BrandProduct, type Brand as BrandT } from '../../api/workspace';

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
      {tab === 'avatars' && <Empty emoji="🧑‍🎤" title="Avatares" text="Los avatares (creadores IA) se eligen automáticamente en la Campaña UGC. La gestión de avatares propios llega pronto." />}
      {tab === 'voices' && <Empty emoji="🎙️" title="Voces" text="Voces IA para los videos UGC — próximamente vas a poder elegir y clonar voces." />}
      {tab === 'assets' && <Empty emoji="🗂️" title="Biblioteca de activos" text="Tus imágenes y videos generados se guardan en Creativos IA → Mis creativos." />}
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
