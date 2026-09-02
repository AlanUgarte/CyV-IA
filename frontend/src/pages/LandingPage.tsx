import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

// Tus mockups, en orden (no hay sección 10). Cada uno se carga desde public/landing/
const SECTIONS: { n: number; label: string }[] = [
  { n: 1, label: 'Hero' },
  { n: 2, label: 'Problema' },
  { n: 3, label: 'Cómo funciona' },
  { n: 4, label: 'Inteligencia' },
  { n: 5, label: 'Generación de creativos' },
  { n: 6, label: 'Resultados' },
  { n: 7, label: 'Integraciones' },
  { n: 8, label: 'Beneficios' },
  { n: 9, label: 'Testimonios' },
  { n: 11, label: 'Gracias' },
];

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
        {SECTIONS.map(s => <SectionImg key={s.n} n={s.n} label={s.label} onCta={toRegister} />)}
      </div>

      {/* CTA flotante */}
      <button onClick={toRegister} style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 50, ...btnPrimary, padding: '14px 22px', fontSize: 15, boxShadow: '0 16px 34px -12px #000' }}>Empezar gratis →</button>
    </div>
  );
}
