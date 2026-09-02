import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

// Tus mockups, en orden (no hay sección 10). Cada uno se carga desde public/landing/
const SECTIONS: { n: number; label: string; pricing?: boolean }[] = [
  { n: 1, label: 'Hero' },
  { n: 2, label: 'Problema' },
  { n: 3, label: 'Cómo funciona' },
  { n: 4, label: 'Inteligencia' },
  { n: 5, label: 'Generación de creativos' },
  { n: 6, label: 'Resultados' },
  { n: 7, label: 'Integraciones' },
  { n: 8, label: 'Beneficios' },
  { n: 9, label: 'Testimonios' },
  { n: 10, label: 'Precios', pricing: true },
  { n: 11, label: 'Gracias' },
];

const PLANS = [
  { name: 'Starter', price: 19, cr: 100, feats: ['100 créditos por mes', 'Imágenes y copy con IA', 'Soporte por email'], featured: false },
  { name: 'Pro', price: 39, cr: 250, feats: ['250 créditos por mes', 'Video y UGC con IA', 'Campañas completas'], featured: true },
  { name: 'Business', price: 79, cr: 600, feats: ['600 créditos por mes', 'Todo lo de Pro', 'Prioridad de generación'], featured: false },
];
function Pricing({ onRegister }: { onRegister: () => void }) {
  return (
    <section style={{ padding: 'clamp(24px,4vw,50px) 0' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 clamp(16px,4vw,40px)' }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: '.2em', color: '#6d6790', margin: '0 0 16px' }}>SECTION 10 — PRECIOS</div>
        <div style={{ background: 'linear-gradient(180deg,#0b0b15,#070710)', border: '1px solid #18182a', borderRadius: 30, padding: 'clamp(28px,4vw,56px)' }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 'clamp(28px,4vw,44px)', color: '#fff', margin: '0 0 8px', textAlign: 'center', letterSpacing: '-.02em' }}>Precios simples. Sin sorpresas.</h2>
          <p style={{ color: '#a49ec4', fontSize: 16, textAlign: 'center', margin: '0 0 38px' }}>Elegí el plan que se ajusta a tu negocio. Cancelás cuando quieras.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 18, maxWidth: 920, margin: '0 auto' }}>
            {PLANS.map(p => (
              <div key={p.name} style={{ position: 'relative', background: p.featured ? 'linear-gradient(180deg,#1a1436,#0f0b1e)' : '#0f0f1c', border: `1px solid ${p.featured ? '#7c5cfc' : '#1c1c2e'}`, borderRadius: 18, padding: '28px 22px', boxShadow: p.featured ? '0 0 44px -12px rgba(124,92,252,.6)' : 'none' }}>
                {p.featured && <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: '#7c5cfc', color: '#fff', fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', borderRadius: 999, padding: '4px 12px', whiteSpace: 'nowrap' }}>MÁS ELEGIDO</div>}
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, color: '#fff' }}>{p.name}</div>
                <div style={{ margin: '10px 0 3px' }}><span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 42, color: '#fff' }}>${p.price}</span><span style={{ color: '#a49ec4', fontSize: 14 }}> USD/mes</span></div>
                <div style={{ fontSize: 13, color: '#8b7bff', marginBottom: 18 }}>{p.cr} créditos por mes</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
                  {p.feats.map(f => <div key={f} style={{ display: 'flex', gap: 8, fontSize: 13.5, color: '#c8c4de' }}><span style={{ color: '#2fd39b' }}>✓</span>{f}</div>)}
                </div>
                <button onClick={onRegister} style={{ width: '100%', background: p.featured ? 'linear-gradient(135deg,#7c5cfc,#4a2fd0)' : 'rgba(255,255,255,.06)', color: '#fff', border: p.featured ? 'none' : '1px solid #2a2a42', borderRadius: 11, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Empezar</button>
              </div>
            ))}
          </div>
          <p style={{ textAlign: 'center', color: '#6d6790', fontSize: 13, marginTop: 26, lineHeight: 1.6 }}>También podés cargar <b style={{ color: '#a49ec4' }}>packs de créditos</b> por transferencia (50 → US$9 · 150 → US$25 · 500 → US$70 · 1000 → US$120). El plan gratis incluye <b style={{ color: '#a49ec4' }}>2 imágenes</b> para probar.</p>
        </div>
      </div>
    </section>
  );
}

const btnPrimary: CSSProperties = { background: 'linear-gradient(135deg,#7c5cfc,#4a2fd0)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer' };
const btnGhost: CSSProperties = { background: 'rgba(255,255,255,.06)', color: '#fff', border: '1px solid #2a2a42', borderRadius: 10, padding: '10px 16px', fontWeight: 600, fontSize: 14, cursor: 'pointer' };

// Carga section-N.png; si no existe prueba .jpg; si tampoco, muestra un marcador.
function SectionImg({ n, label, onCta }: { n: number; label: string; onCta: () => void }) {
  const [stage, setStage] = useState(0);
  if (stage >= 2) {
    return (
      <div style={{ margin: '0 auto', maxWidth: 1320, border: '1.5px dashed #2a2a42', borderRadius: 16, padding: '48px 20px', textAlign: 'center', color: '#8b84a3', background: '#0a0a14' }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: '.14em', color: '#6d6790', marginBottom: 10 }}>SECCIÓN {n} — {label.toUpperCase()}</div>
        <div style={{ fontSize: 15, color: '#c8c4de' }}>Guardá tu imagen como <b style={{ color: '#a78bfa' }}>public/landing/section-{n}.png</b></div>
      </div>
    );
  }
  const src = `/landing/section-${n}.${stage === 0 ? 'png' : 'jpg'}`;
  return (
    <img src={src} alt={label} loading="lazy" onError={() => setStage(s => s + 1)}
      onClick={n === 1 || n === 11 ? onCta : undefined}
      style={{ display: 'block', width: '100%', cursor: n === 1 || n === 11 ? 'pointer' : 'default' }} />
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const toRegister = () => navigate('/auth', { state: { tab: 'register' } });
  const toLogin = () => navigate('/auth', { state: { tab: 'login' } });
  return (
    <div style={{ background: '#000', minHeight: '100vh' }}>
      {/* Header con botones que navegan */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', gap: 12, padding: '12px clamp(16px,4vw,40px)', background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #17172a' }}>
        <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, color: '#fff', letterSpacing: '-.01em' }}>CONVERSIA</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <button onClick={toLogin} style={btnGhost}>Iniciar sesión</button>
          <button onClick={toRegister} style={btnPrimary}>Empezar gratis</button>
        </div>
      </header>

      {/* Tus imágenes, en orden */}
      <div style={{ maxWidth: 1320, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 6, padding: '6px 0 40px' }}>
        {SECTIONS.map(s => s.pricing
          ? <Pricing key="pricing" onRegister={toRegister} />
          : <SectionImg key={s.n} n={s.n} label={s.label} onCta={toRegister} />)}
      </div>

      {/* CTA flotante */}
      <button onClick={toRegister} style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 50, ...btnPrimary, padding: '14px 22px', fontSize: 15, boxShadow: '0 16px 34px -12px #000' }}>Empezar gratis →</button>
    </div>
  );
}
