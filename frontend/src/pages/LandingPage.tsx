import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Paleta Conversia ─────────────────────────────────────────────────────────
const P = {
  bg: '#000000', bg2: '#0a0a14', card: '#0f0f1c', card2: '#101020', border: '#1c1c2e', border2: '#2a2a42',
  text: '#f3f1fb', muted: '#a49ec4', dim: '#6d6790',
  violet: '#7c5cfc', violet2: '#a78bfa', violetD: '#4a2fd0',
  green: '#2fd39b', blue: '#4b9bff', pink: '#f065a7', amber: '#ffb15c', red: '#ff5c7a',
};
const PLATFORMS: Record<string, string> = { Meta: '#1877f2', 'Google Ads': '#ea9e34', Instagram: '#e1306c', Facebook: '#1877f2', TikTok: '#25d0c0', WhatsApp: '#25d366' };

// ── Reveal on scroll ─────────────────────────────────────────────────────────
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); obs.disconnect(); } }, { threshold });
    obs.observe(el); return () => obs.disconnect();
  }, [threshold]);
  return { ref, v };
}
function Fade({ children, delay = 0, y = 22 }: { children: ReactNode; delay?: number; y?: number }) {
  const { ref, v } = useInView();
  return <div ref={ref} style={{ opacity: v ? 1 : 0, transform: v ? 'none' : `translateY(${y}px)`, transition: `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms` }}>{children}</div>;
}

// ── Átomos ───────────────────────────────────────────────────────────────────
const H1: CSSProperties = { fontFamily: "'Syne',sans-serif", fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.04, color: P.text, margin: 0 };
const wrap: CSSProperties = { maxWidth: 1200, margin: '0 auto', padding: '0 clamp(18px,4vw,40px)' };
const eyebrow: CSSProperties = { fontFamily: "'DM Mono',monospace", fontSize: 12.5, letterSpacing: '.2em', textTransform: 'uppercase', color: P.dim, margin: '0 0 22px' };

function Btn({ children, onClick, variant = 'primary', big }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'white'; big?: boolean }) {
  const base: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 9, borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: big ? 15.5 : 14, padding: big ? '15px 26px' : '11px 20px', border: 'none', transition: 'transform .15s ease, box-shadow .15s ease', fontFamily: 'inherit' };
  const styles: Record<string, CSSProperties> = {
    primary: { ...base, background: `linear-gradient(135deg,${P.violet},${P.violetD})`, color: '#fff', boxShadow: `0 14px 34px -12px ${P.violet}aa` },
    ghost: { ...base, background: 'rgba(255,255,255,.04)', color: P.text, border: `1px solid ${P.border2}` },
    white: { ...base, background: '#fff', color: P.violetD },
  };
  return <button onClick={onClick} style={styles[variant]} onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')} onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>{children}</button>;
}
function Pill({ children }: { children: ReactNode }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: P.violet2, background: `${P.violet}1c`, border: `1px solid ${P.violet}3a`, borderRadius: 999, padding: '7px 15px' }}>{children}</span>;
}
function Check({ children }: { children: ReactNode }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: P.muted }}><span style={{ color: P.green }}>✓</span>{children}</span>;
}
const frameStyle: CSSProperties = { background: 'linear-gradient(180deg,#0b0b15,#070710)', border: '1px solid #18182a', borderRadius: 30, padding: 'clamp(24px,3.8vw,54px)' };

// ── Gráficos ─────────────────────────────────────────────────────────────────
function Area({ color = P.violet, tip }: { color?: string; tip?: string }) {
  const line = 'M0,86 C34,74 52,84 78,64 C104,46 120,58 150,42 C180,28 200,36 232,26 C262,17 282,22 320,10';
  return (
    <svg viewBox="0 0 320 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
      <defs><linearGradient id={'ag' + color} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".34" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={line + ' L320,100 L0,100 Z'} fill={`url(#ag${color})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="150" cy="42" r="4.5" fill="#fff" stroke={color} strokeWidth="2.5" />
      {tip && <g><rect x="120" y="12" width="62" height="22" rx="6" fill="#000" opacity=".72" /><text x="151" y="27" textAnchor="middle" fontSize="11" fill="#fff" fontWeight="600">{tip}</text></g>}
    </svg>
  );
}
function Spark({ color, w = 120, h = 34 }: { color: string; w?: number; h?: number }) {
  const pts = Array.from({ length: 12 }, (_, i) => 8 + ((Math.sin(i * .8 + (color.length)) + 1) / 2) * 16 + i * .6);
  const mx = Math.max(...pts), mn = Math.min(...pts), sp = mx - mn || 1;
  const d = pts.map((v, i) => `${(i * (w / 11)).toFixed(1)},${(h - 3 - ((v - mn) / sp) * (h - 6)).toFixed(1)}`).join(' ');
  return <svg width={w} height={h} style={{ display: 'block' }}><polyline points={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}
function Donut({ segs, label, value }: { segs: [string, number, string][]; label: string; value: string }) {
  const C = 2 * Math.PI * 42; let off = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: 128, height: 128, flexShrink: 0 }}>
        <svg viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
          {segs.map(([, pct, col], i) => { const len = C * pct / 100; const el = <circle key={i} cx="55" cy="55" r="42" fill="none" stroke={col} strokeWidth="13" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} />; off += len; return el; })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}><div><div style={{ fontSize: 10, color: P.dim }}>{label}</div><div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15 }}>{value}</div></div></div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {segs.map(([name, pct, col]) => <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: P.muted }}><span style={{ width: 9, height: 9, borderRadius: 3, background: col }} /><span style={{ flex: 1 }}>{name}</span><b style={{ color: P.text }}>{pct}%</b></div>)}
      </div>
    </div>
  );
}
function Logo({ size = 30 }: { size?: number }) {
  return <span style={{ display: 'inline-grid', placeItems: 'center', width: size, height: size, borderRadius: size * .28, background: `linear-gradient(135deg,${P.violet},${P.violetD})`, color: '#fff', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: size * .5, boxShadow: `0 8px 20px -8px ${P.violet}` }}>✦</span>;
}
function KPI({ label, value, delta, up = true, spark }: { label: string; value: string; delta?: string; up?: boolean; spark?: string }) {
  return (
    <div style={{ background: P.bg2, border: `1px solid ${P.border}`, borderRadius: 12, padding: '11px 13px', minWidth: 0 }}>
      <div style={{ fontSize: 10.5, color: P.dim }}>{label}</div>
      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, margin: '2px 0 1px' }}>{value}</div>
      {delta && <div style={{ fontSize: 10.5, color: up ? P.green : P.red }}>{up ? '↑' : '↓'} {delta}</div>}
      {spark && <div style={{ marginTop: 4 }}><Spark color={spark} w={80} h={22} /></div>}
    </div>
  );
}

// ── Marco de app (mockup del panel) ──────────────────────────────────────────
const RAIL = ['Inicio', 'Resumen', 'Campañas', 'Anuncios', 'Creativos', 'Reportes', 'Audiencias', 'Integraciones', 'Configuración'];
function AppFrame({ children, active = 'Inicio', title = 'Resumen general', mini }: { children: ReactNode; active?: string; title?: string; mini?: boolean }) {
  return (
    <div style={{ background: P.card, border: `1px solid ${P.border2}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 40px 90px -50px #000', display: 'flex', minHeight: mini ? 260 : 320 }}>
      {!mini && (
        <div style={{ width: 150, flexShrink: 0, borderRight: `1px solid ${P.border}`, padding: '14px 10px', background: P.bg2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 6px 14px' }}><Logo size={22} /><span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 13 }}>CONVERSIA</span></div>
          {RAIL.map(r => <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 8, fontSize: 11.5, marginBottom: 2, color: r === active ? P.text : P.dim, background: r === active ? `${P.violet}22` : 'transparent', fontWeight: r === active ? 700 : 500 }}><span style={{ width: 5, height: 5, borderRadius: 2, background: r === active ? P.violet : P.border2 }} />{r}</div>)}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14 }}>{title}</div>
          <div style={{ fontSize: 11, color: P.muted, border: `1px solid ${P.border}`, borderRadius: 8, padding: '5px 10px' }}>Últimos 7 días ▾</div>
        </div>
        {children}
      </div>
    </div>
  );
}
function DashHome() {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 9, marginBottom: 12 }}>
        <KPI label="Ventas" value="$65.800" delta="32%" />
        <KPI label="ROAS" value="4,2x" delta="24%" />
        <KPI label="Clics" value="126.540" delta="28%" />
        <KPI label="CTR" value="3,45%" delta="18%" />
      </div>
      <div style={{ background: P.bg2, border: `1px solid ${P.border}`, borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <div style={{ fontSize: 11.5, color: P.muted, marginBottom: 6 }}>Evolución de resultados</div>
        <div style={{ height: 120 }}><Area tip="$52.408" /></div>
      </div>
      <div style={{ background: P.bg2, border: `1px solid ${P.border}`, borderRadius: 12, padding: 12 }}>
        <div style={{ fontSize: 11.5, color: P.muted, marginBottom: 8 }}>Principales plataformas</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[['Meta', '42%'], ['Google Ads', '28%'], ['Instagram', '20%'], ['TikTok', '10%']].map(([n, p]) => <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}><span style={{ width: 16, height: 16, borderRadius: 5, background: PLATFORMS[n] ?? P.violet }} /><span>{n}</span><b style={{ color: P.muted }}>{p}</b></div>)}
        </div>
      </div>
    </>
  );
}

// ── Secciones ────────────────────────────────────────────────────────────────
function Section({ children, id, n, label, style }: { children: ReactNode; id?: string; n?: number; label?: string; style?: CSSProperties }) {
  return (
    <section id={id} style={{ padding: 'clamp(24px,4vw,50px) 0', ...style }}>
      <div style={wrap}>
        {n && <div style={{ ...eyebrow, margin: '0 0 16px' }}>Section {n} — {label}</div>}
        <div style={frameStyle}>{children}</div>
      </div>
    </section>
  );
}

function Hero({ toRegister, toLogin }: { toRegister: () => void; toLogin: () => void }) {
  return (
    <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(18px,3vw,36px) 0' }}>
      <div style={wrap}>
        <div style={{ ...eyebrow, margin: '0 0 16px' }}>Section 1 — Hero</div>
        <div style={{ ...frameStyle, position: 'relative', overflow: 'hidden', padding: 'clamp(20px,2.6vw,36px)' }}>
          <div style={{ position: 'absolute', top: -180, right: -120, width: 560, height: 560, background: `radial-gradient(circle,${P.violet}26,transparent 62%)`, filter: 'blur(18px)', pointerEvents: 'none' }} />
          {/* Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 20, position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 8 }}><Logo /><span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20, letterSpacing: '-.01em' }}>CONVERSIA</span></div>
        <div style={{ display: 'flex', gap: 22, marginLeft: 10 }} className="lp-navlinks">
          {[['Producto', 'beneficios'], ['Cómo funciona', 'como'], ['Resultados', 'resultados'], ['Precios', 'gracias']].map(([l, a]) => <a key={l} href={'#' + a} style={{ color: P.muted, fontSize: 14, textDecoration: 'none' }}>{l}</a>)}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          <Btn variant="ghost" onClick={toLogin}>Iniciar sesión</Btn>
          <Btn onClick={toRegister}>Empezar gratis</Btn>
        </div>
      </nav>
          {/* Hero body */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 40, alignItems: 'center', paddingTop: 'clamp(26px,4vw,50px)', position: 'relative', zIndex: 2 }} className="lp-hero">
        <Fade>
          <Pill>🚀 La plataforma para tu publicidad</Pill>
          <h1 style={{ ...H1, fontSize: 'clamp(30px,4.4vw,52px)', margin: '20px 0 18px' }}>Tu próximo cliente no debería depender de horas de trabajo. <span style={{ color: '#8878ff' }}>Dejá que la IA cree, publique y optimice tus campañas.</span></h1>
          <p style={{ color: P.muted, fontSize: 17, lineHeight: 1.6, margin: '0 0 28px', maxWidth: 520 }}>Subí tu producto. Creá una campaña en 2 minutos. Conversia se encarga de todo el trabajo pesado: desde los creativos y copys hasta la segmentación y el análisis.</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
            <Btn big onClick={toRegister}>Empezar gratis →</Btn>
            <Btn big variant="ghost" onClick={() => document.getElementById('como')?.scrollIntoView({ behavior: 'smooth' })}>Ver cómo funciona</Btn>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}><Check>Sin tarjeta de crédito</Check><Check>Configuración en minutos</Check><Check>Control total de tu gasto</Check></div>
        </Fade>
        <Fade delay={120}>
          <div style={{ position: 'relative' }}>
            <AppFrame active="Resumen" title="Rendimiento general"><DashHome /></AppFrame>
            <FloatTag style={{ top: -14, left: 24 }}>🎯 Audiencia lograda</FloatTag>
            <FloatTag style={{ bottom: 70, left: -20 }}>📣 +4 creativos publicados</FloatTag>
            <FloatTag style={{ bottom: 8, right: 30 }}>✅ Optimización con IA habilitada</FloatTag>
            <FloatTag style={{ top: '44%', right: -22 }}>📈 Reportes generados</FloatTag>
          </div>
        </Fade>
          </div>
        </div>
      </div>
    </section>
  );
}
function FloatTag({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ position: 'absolute', display: 'flex', alignItems: 'center', gap: 7, background: '#14121f', border: `1px solid ${P.border2}`, borderRadius: 11, padding: '9px 13px', fontSize: 12.5, fontWeight: 600, color: P.text, boxShadow: '0 16px 34px -18px #000', ...style }} className="lp-floattag">{children}</div>;
}

function Problema() {
  const labels = ['Cambios en cada plataforma', 'Copys que no convierten', 'Múltiples cuentas', 'Datos por todos lados', 'Diseños que demoran horas', 'Publicaciones que nadie ve', 'Informes difíciles de entender'];
  return (
    <Section n={2} label="Problema">
      <Fade><h2 style={{ ...H1, fontSize: 'clamp(28px,4.4vw,46px)', maxWidth: 720 }}>Publicar anuncios no debería ser un trabajo de tiempo completo.</h2></Fade>
      <Fade delay={100}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 40, justifyContent: 'center' }}>
          {labels.map((l, i) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: '14px 18px', fontSize: 14.5, color: P.text, transform: `rotate(${(i % 3 - 1) * 1.4}deg)`, boxShadow: '0 20px 40px -30px #000' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 8, background: `${P.violet}22`, color: P.violet2, fontSize: 13 }}>✕</span>{l}
            </div>
          ))}
        </div>
      </Fade>
    </Section>
  );
}

function Como() {
  const steps = [
    { n: '01', ic: '⬆️', t: 'Subí tu producto en minutos.', d: 'Cargá tu producto con fotos y precio. En menos de 2 minutos ya está listo.' },
    { n: '02', ic: '✨', t: 'La IA crea los anuncios por vos.', d: 'Genera títulos, descripciones, creatividades y el público ideal. Todo optimizado para vender.' },
    { n: '03', ic: '↗️', t: 'Se publican en todas las plataformas.', d: 'Publicamos tus anuncios en Facebook, Instagram, TikTok, Google y más. Sin que tengas que hacer nada.' },
    { n: '04', ic: '📊', t: 'Recibís ventas mientras descansás.', d: 'Llegan clientes, se generan ventas y tu negocio crece en piloto automático. Vos solo mirás los resultados.' },
  ];
  return (
    <Section id="como" n={3} label="Cómo funciona">
      <Fade><h2 style={{ ...H1, fontSize: 'clamp(28px,4.4vw,46px)', maxWidth: 640, marginBottom: 44 }}>De un producto a nuevos clientes. Automáticamente.</h2></Fade>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 16 }}>
        {steps.map((s, i) => (
          <Fade key={s.n} delay={i * 80}>
            <div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: 22, height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}><span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: P.violet2 }}>{s.n}</span><span style={{ fontSize: 20 }}>{s.ic}</span></div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{s.t}</div>
              <div style={{ fontSize: 13.5, color: P.muted, lineHeight: 1.55 }}>{s.d}</div>
            </div>
          </Fade>
        ))}
      </div>
    </Section>
  );
}

function Inteligencia() {
  const inputs = [['📊', 'Datos de campañas'], ['👥', 'Audiencias'], ['🗄️', 'Miles de datos en tiempo real']];
  const outputs = [['📈', 'Mejores decisiones', 'La IA elige qué funciona mejor para vos.'], ['💲', 'Mayor rendimiento', 'Más conversiones, menor costo.'], ['✓', 'Crecimiento continuo', 'Aprende, se adapta y mejora sin parar.']];
  const steps = [['01', 'Análisis predictivo.', 'Detectamos patrones y oportunidades antes que nadie.'], ['02', 'Optimización automática.', 'Ajustamos pujas, anuncios y audiencias para máxima performance.'], ['03', 'Resultados en tiempo real.', 'Monitoreo 24/7 para que siempre estés un paso adelante.']];
  return (
    <Section n={4} label="Inteligencia">

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }} className="lp-2col">
        <Fade>
          <h2 style={{ ...H1, fontSize: 'clamp(26px,4vw,42px)', marginBottom: 16 }}>Tu publicidad más inteligente, siempre.</h2>
          <p style={{ color: P.muted, fontSize: 15.5, lineHeight: 1.6, marginBottom: 26, maxWidth: 460 }}>Nuestra IA analiza miles de datos en tiempo real para optimizar tus campañas, presupuestos y audiencias automáticamente.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {steps.map(([n, t, d]) => <div key={n} style={{ display: 'flex', gap: 14, background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, padding: '14px 16px' }}><span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, color: P.blue, fontSize: 18 }}>{n}</span><div><div style={{ fontWeight: 700, fontSize: 14.5 }}>{t}</div><div style={{ fontSize: 13, color: P.muted }}>{d}</div></div></div>)}
          </div>
        </Fade>
        <Fade delay={120}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 1fr', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{inputs.map(([ic, t]) => <div key={t} style={miniCard}><span style={{ fontSize: 16 }}>{ic}</span><span style={{ fontSize: 12 }}>{t}</span></div>)}</div>
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <div style={{ width: 120, height: 120, borderRadius: 24, background: `radial-gradient(circle,${P.violet}44,${P.card})`, border: `1px solid ${P.violet}66`, display: 'grid', placeItems: 'center', textAlign: 'center', boxShadow: `0 0 50px -10px ${P.violet}88` }}>
                <div><div style={{ fontSize: 30 }}>🧠</div><div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 13, marginTop: 2 }}>CONVERSIA</div><div style={{ fontSize: 8.5, color: P.violet2, letterSpacing: '.1em' }}>IA INTELIGENTE</div></div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{outputs.map(([ic, t, d]) => <div key={t} style={{ ...miniCard, flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}><div style={{ display: 'flex', gap: 7, alignItems: 'center' }}><span style={{ color: P.blue }}>{ic}</span><span style={{ fontSize: 12.5, fontWeight: 700 }}>{t}</span></div><span style={{ fontSize: 10.5, color: P.dim }}>{d}</span></div>)}</div>
          </div>
          <div style={{ marginTop: 16, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: P.muted, marginBottom: 10 }}>La IA trabaja por vos, 24/7</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>{['Segmenta', 'Prueba', 'Aprende', 'Optimiza', 'Escala'].map(c => <span key={c} style={{ fontSize: 12, fontWeight: 600, color: P.text, background: `${P.blue}1e`, border: `1px solid ${P.blue}44`, borderRadius: 999, padding: '5px 12px' }}>✓ {c}</span>)}</div>
          </div>
        </Fade>
      </div>
    </Section>
  );
}
const miniCard: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, background: P.card, border: `1px solid ${P.border}`, borderRadius: 11, padding: '12px 13px' };

function Generacion() {
  const feats = [['🖼️', 'Imágenes impactantes', 'Variaciones únicas generadas con IA.'], ['▶️', 'Videos cortos', 'Clips dinámicos listos para captar atención.'], ['🅃', 'Textos que convierten', 'Titulares y descripciones probadas y efectivas.'], ['⚡', 'CTAs optimizados', 'Llamados a la acción que generan más clics.']];
  const stats = [['10x', 'Más rápido', 'que hacerlo manualmente'], ['+35%', 'Mejor rendimiento', 'promedio'], ['50+', 'Variaciones', 'por cada idea'], ['IA', 'Optimiza y aprende', 'en cada iteración']];
  return (
    <Section n={5} label="Generación de creativos">
      <Fade><h2 style={{ ...H1, fontSize: 'clamp(26px,4vw,42px)', maxWidth: 640, marginBottom: 12 }}>Una idea. Decenas de anuncios listos para probar.</h2>
        <p style={{ color: P.muted, fontSize: 15.5, maxWidth: 560, marginBottom: 40 }}>Convertí una idea en múltiples variaciones de anuncios con IA. Imágenes, videos, textos y llamados a la acción optimizados para cada plataforma.</p></Fade>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'center' }} className="lp-2col">
        <Fade>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {feats.map(([ic, t, d]) => <div key={t} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: 16 }}><div style={{ width: 38, height: 38, borderRadius: 10, background: `${P.violet}22`, display: 'grid', placeItems: 'center', fontSize: 18, marginBottom: 10 }}>{ic}</div><div style={{ fontWeight: 700, fontSize: 14 }}>{t}</div><div style={{ fontSize: 12.5, color: P.muted, marginTop: 3 }}>{d}</div></div>)}
          </div>
        </Fade>
        <Fade delay={120}>
          <AppFrame active="Creativos" title="Generador de creativos">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
              <KPI label="Ideas" value="24" delta="12%" /><KPI label="Creativos" value="126" delta="28%" /><KPI label="Variaciones" value="320" delta="35%" /><KPI label="CTR" value="2,45%" delta="18%" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {[['🖼️', P.violet], ['🖼️', P.blue], ['▶️', P.pink], ['▶️', P.amber]].map(([ic, c], i) => <div key={i} style={{ aspectRatio: '1', borderRadius: 10, background: `linear-gradient(150deg,${c}44,${P.bg2})`, border: `1px solid ${P.border}`, display: 'grid', placeItems: 'center', fontSize: 22 }}>{ic}</div>)}
              {['Más ventas.', 'La IA optimiza.', 'Tu cliente a un clic.', 'Vendé con IA.'].map((t, i) => <div key={i} style={{ aspectRatio: '1', borderRadius: 10, background: P.bg2, border: `1px solid ${P.border}`, padding: 8, display: 'flex', alignItems: 'flex-end', fontSize: 11, fontWeight: 700 }}>{t}</div>)}
            </div>
          </AppFrame>
        </Fade>
      </div>
      <Fade delay={80}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginTop: 22 }}>
        {stats.map(([v, t, d]) => <div key={t} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: 18 }}><div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 24, color: P.green }}>{v}</div><div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 4 }}>{t}</div><div style={{ fontSize: 12, color: P.dim }}>{d}</div></div>)}
      </div></Fade>
    </Section>
  );
}

function Resultados() {
  const feats = [['📊', 'Métricas en tiempo real', 'Datos actualizados al instante para tomar mejores decisiones.'], ['🎯', 'Rendimiento por campaña', 'Compará campañas y encontrá las que más convierten.'], ['📈', 'Análisis profundo', 'Desglosá cada métrica y entendé qué está funcionando.'], ['🚀', 'Resultados que importan', 'Más ventas, mejor ROAS y crecimiento constante.']];
  return (
    <Section id="resultados" n={6} label="Resultados">

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 34, alignItems: 'start' }} className="lp-2col">
        <div>
          <Fade><h2 style={{ ...H1, fontSize: 'clamp(26px,4vw,42px)', marginBottom: 14 }}>Cada campaña. Todos tus números.</h2>
            <p style={{ color: P.muted, fontSize: 15.5, maxWidth: 460, marginBottom: 26 }}>Medí en tiempo real el rendimiento de cada campaña y optimizá para obtener mejores resultados.</p></Fade>
          <Fade delay={100}>
            <AppFrame active="Reportes" title="Rendimiento">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 7, marginBottom: 12 }}>
                <KPI label="Alcance" value="84K" delta="28%" spark={P.blue} /><KPI label="Clics" value="5,47" delta="16%" spark={P.violet} /><KPI label="Ventas" value="$20.000" delta="32%" spark={P.green} /><KPI label="ROAS" value="4,2x" delta="24%" spark={P.pink} /><KPI label="CTR" value="3,45%" delta="12%" spark={P.amber} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10 }}>
                <div style={{ background: P.bg2, border: `1px solid ${P.border}`, borderRadius: 12, padding: 12 }}><div style={{ fontSize: 11.5, color: P.muted, marginBottom: 6 }}>Rendimiento</div><div style={{ height: 120 }}><Area tip="$12.000" /></div></div>
                <div style={{ background: P.bg2, border: `1px solid ${P.border}`, borderRadius: 12, padding: 12 }}><div style={{ fontSize: 11.5, color: P.muted, marginBottom: 8 }}>Conversión por plataforma</div><Donut label="Ventas" value="$20.000" segs={[['Instagram', 42, P.pink], ['Facebook', 28, P.violet], ['Google Ads', 20, P.blue], ['TikTok', 10, P.green]]} /></div>
              </div>
            </AppFrame>
          </Fade>
        </div>
        <Fade delay={160}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {feats.map(([ic, t, d]) => <div key={t} style={{ display: 'flex', gap: 13, background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: 16 }}><div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: `${P.violet}22`, display: 'grid', placeItems: 'center', fontSize: 18 }}>{ic}</div><div><div style={{ fontWeight: 700, fontSize: 14.5 }}>{t}</div><div style={{ fontSize: 13, color: P.muted, marginTop: 2 }}>{d}</div></div></div>)}
            <div style={{ background: `linear-gradient(135deg,${P.violet},${P.violetD})`, borderRadius: 16, padding: 20 }}><div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 17, color: '#fff', marginBottom: 12 }}>Tomá decisiones basadas en datos. Escalá lo que funciona.</div><Btn variant="white">Empezar gratis →</Btn></div>
          </div>
        </Fade>
      </div>
    </Section>
  );
}

function Integraciones() {
  const rows: [string, string, string, string][] = [['Meta', '$12.450', '$45.230', '3,6x'], ['Google Ads', '$6.780', '$18.900', '2,8x'], ['Instagram', '$4.230', '$12.450', '2,9x'], ['Facebook', '$5.120', '$14.230', '2,7x'], ['WhatsApp', '256', '87', '$9.870']];
  const feats = [['🔄', 'Sincronización automática', 'Tus datos siempre actualizados.'], ['🧠', 'IA que optimiza', 'Asignación inteligente de presupuesto.'], ['📊', 'Reportes unificados', 'Métricas claras en un solo panel.'], ['🛡️', 'Seguridad total', 'Tus datos protegidos y encriptados.']];
  return (
    <Section id="integraciones" n={7} label="Integraciones">

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 40, alignItems: 'center' }} className="lp-2col">
        <Fade>
          <h2 style={{ ...H1, fontSize: 'clamp(26px,4vw,42px)', marginBottom: 16 }}>Tu publicidad conectada en un solo lugar.</h2>
          <p style={{ color: P.muted, fontSize: 15.5, lineHeight: 1.6, marginBottom: 30, maxWidth: 440 }}>Conectá tus cuentas publicitarias y centralizá todas tus campañas. La IA optimiza automáticamente la inversión en cada plataforma para que obtengas más resultados.</p>
          <NodeGraph />
        </Fade>
        <Fade delay={120}>
          <div style={{ background: P.card, border: `1px solid ${P.border2}`, borderRadius: 16, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}><span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14 }}>Rendimiento por plataforma</span><span style={{ fontSize: 11, color: P.muted }}>Últimos 7 días ▾</span></div>
            {rows.map(([n, a, b, c], i) => (
              <div key={n} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr .8fr .8fr .7fr', gap: 8, alignItems: 'center', padding: '11px 0', borderBottom: i < rows.length - 1 ? `1px solid ${P.border}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}><span style={{ width: 24, height: 24, borderRadius: 7, background: PLATFORMS[n] ?? P.violet, flexShrink: 0 }} /><div style={{ minWidth: 0 }}><div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{n}</div><div style={{ fontSize: 10, color: P.green }}>● Conectada</div></div></div>
                <Spark color={PLATFORMS[n] ?? P.violet} w={70} h={26} />
                <div><div style={{ fontSize: 9, color: P.dim }}>{n === 'WhatsApp' ? 'Conversac.' : 'Gasto'}</div><div style={{ fontSize: 12.5, fontWeight: 700 }}>{a}</div></div>
                <div><div style={{ fontSize: 9, color: P.dim }}>{n === 'WhatsApp' ? 'Clientes' : 'Ventas'}</div><div style={{ fontSize: 12.5, fontWeight: 700 }}>{b}</div></div>
                <div><div style={{ fontSize: 9, color: P.dim }}>{n === 'WhatsApp' ? 'Ventas' : 'ROAS'}</div><div style={{ fontSize: 12.5, fontWeight: 700, color: P.green }}>{c}</div></div>
              </div>
            ))}
          </div>
        </Fade>
      </div>
      <Fade delay={80}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginTop: 22 }}>
        {feats.map(([ic, t, d]) => <div key={t} style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: 18, textAlign: 'center' }}><div style={{ fontSize: 22, marginBottom: 8 }}>{ic}</div><div style={{ fontWeight: 700, fontSize: 14 }}>{t}</div><div style={{ fontSize: 12.5, color: P.muted, marginTop: 3 }}>{d}</div></div>)}
      </div></Fade>
    </Section>
  );
}
function NodeGraph() {
  const nodes = ['Meta', 'Google Ads', 'Instagram', 'Facebook', 'WhatsApp'];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: P.card, border: `1px solid ${P.violet}66`, borderRadius: 12, padding: '12px 16px', boxShadow: `0 0 34px -12px ${P.violet}`, fontFamily: "'Syne',sans-serif", fontWeight: 800 }}><Logo size={24} /> CONVERSIA</div>
      <span style={{ color: P.dim }}>→</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {nodes.map(n => <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 7, background: P.bg2, border: `1px solid ${P.border}`, borderRadius: 10, padding: '9px 12px', fontSize: 12.5 }}><span style={{ width: 15, height: 15, borderRadius: 5, background: PLATFORMS[n] ?? P.violet }} />{n}<span style={{ fontSize: 9, color: P.green }}>●</span></div>)}
      </div>
    </div>
  );
}

function Beneficios() {
  const cards = [['⚡', 'Más velocidad', 'Pasá de horas a minutos. La IA hace el trabajo pesado.'], ['✨', 'Más creativos', 'Potenciá tus ideas y sorprendé a tus audiencias.'], ['🎯', 'Decisiones inteligentes', 'Tomá decisiones basadas en datos reales, no suposiciones.'], ['🔗', 'Todo conectado', 'Productos, anuncios, campañas y clientes en un solo lugar.'], ['📊', 'Mejores resultados', 'Más ventas, mejor ROAS y crecimiento constante.'], ['🛡️', 'Seguridad total', 'Tus datos protegidos con encriptación de nivel empresarial.']];
  return (
    <Section id="beneficios" n={8} label="Beneficios">

      <Fade><h2 style={{ ...H1, fontSize: 'clamp(28px,4.4vw,48px)', marginBottom: 40 }}>Beneficios</h2></Fade>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginBottom: 26 }}>
        {cards.map(([ic, t, d], i) => <Fade key={t} delay={i * 60}><div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 16, padding: 22, height: '100%' }}><div style={{ width: 42, height: 42, borderRadius: 12, background: `${P.violet}22`, display: 'grid', placeItems: 'center', fontSize: 20, marginBottom: 14 }}>{ic}</div><div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{t}</div><div style={{ fontSize: 13.5, color: P.muted, lineHeight: 1.55 }}>{d}</div></div></Fade>)}
      </div>
      <Fade><div style={{ background: `linear-gradient(120deg,${P.violet}2e,${P.card})`, border: `1px solid ${P.violet}44`, borderRadius: 18, padding: 'clamp(20px,3vw,30px)', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ width: 56, height: 56, borderRadius: 15, background: `linear-gradient(135deg,${P.violet},${P.violetD})`, display: 'grid', placeItems: 'center', fontSize: 26 }}>🚀</div>
        <div style={{ flex: 1, minWidth: 240 }}><div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22 }}>Automatizá. Optimizá. Escalá.</div><div style={{ color: P.muted, fontSize: 14, marginTop: 4 }}>CONVERSIA trabaja por vos para que vos te enfoques en lo que más importa: hacer crecer tu negocio.</div></div>
        <Btn variant="white" big>Empezar gratis →</Btn>
      </div></Fade>
    </Section>
  );
}

function Testimonios() {
  const tt = [
    { n: 'Matías R.', r: 'E-commerce | Argentina', t: 'Desde que uso CONVERSIA, mis ventas en Meta Ads se dispararon. La IA realmente hace la diferencia.', tag: '+423% en ventas', ago: 'Hace 2 semanas', c: PLATFORMS['Meta'] },
    { n: 'Lucía G.', r: 'Tienda online | México', t: 'La plataforma es súper fácil de usar y los resultados son increíbles. Ahorramos tiempo y aumentamos el ROAS.', tag: '+317% en ROAS', ago: 'Hace 1 mes', c: PLATFORMS['Google Ads'] },
    { n: 'Facundo M.', r: 'Agencia de Marketing | España', t: 'Probamos varias herramientas, pero CONVERSIA es la más completa. La integración con todas las plataformas es un golazo.', tag: '+286% en alcance', ago: 'Hace 3 semanas', c: PLATFORMS['Instagram'] },
    { n: 'Sofía L.', r: 'Marca de ropa | Colombia', t: 'La inteligencia artificial optimiza todo automáticamente. Ahora nos podemos enfocar en lo importante: hacer crecer la marca.', tag: '+541% en interacciones', ago: 'Hace 1 mes', c: PLATFORMS['TikTok'] },
  ];
  return (
    <Section n={9} label="Testimonios / Prueba social">

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 30, alignItems: 'start' }} className="lp-2col">
        <div>
          <Fade><h2 style={{ ...H1, fontSize: 'clamp(26px,4vw,42px)', marginBottom: 14 }}>Negocios que ya están automatizando su publicidad.</h2>
            <p style={{ color: P.muted, fontSize: 15.5, marginBottom: 26, maxWidth: 480 }}>Empresas y emprendedores de todo el mundo ya confían en CONVERSIA para escalar sus resultados con IA. Conocé algunas de sus historias.</p></Fade>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {tt.map((x, i) => <Fade key={x.n} delay={i * 60}><div style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: 18, height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}><div style={{ width: 34, height: 34, borderRadius: '50%', background: `${P.violet}33`, display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13 }}>{x.n[0]}</div><div><div style={{ fontSize: 13.5, fontWeight: 700 }}>{x.n}</div><div style={{ fontSize: 11, color: P.dim }}>{x.r}</div></div></div>
              <div style={{ fontSize: 13.5, color: P.text, lineHeight: 1.55, marginBottom: 14 }}>“{x.t}”</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: P.green }}><span style={{ width: 12, height: 12, borderRadius: 4, background: x.c }} />{x.tag}</span><span style={{ fontSize: 10.5, color: P.dim }}>{x.ago}</span></div>
            </div></Fade>)}
          </div>
        </div>
        <Fade delay={140}>
          <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
            <div style={{ flex: 1, background: `linear-gradient(150deg,${P.green}1e,${P.card})`, border: `1px solid ${P.green}33`, borderRadius: 14, padding: 16 }}><div style={{ fontSize: 22, marginBottom: 6 }}>📈</div><div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 24, color: P.green }}>+324%</div><div style={{ fontSize: 12, color: P.muted }}>Crecimiento promedio en campañas activas</div></div>
            <div style={{ flex: 1, background: `linear-gradient(150deg,${P.blue}1e,${P.card})`, border: `1px solid ${P.blue}33`, borderRadius: 14, padding: 16 }}><div style={{ fontSize: 22, marginBottom: 6 }}>💙</div><div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 24, color: P.blue }}>98%</div><div style={{ fontSize: 12, color: P.muted }}>Clientes satisfechos con los resultados</div></div>
          </div>
          <AppFrame active="Inicio" title="Rendimiento general"><DashHome /></AppFrame>
          <div style={{ marginTop: 14, background: `linear-gradient(120deg,${P.violet},${P.violetD})`, borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}><div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 18, color: '#fff' }}>Tu próximo cliente puede estar a una campaña de distancia.</div><div style={{ fontSize: 12.5, color: 'rgba(255,255,255,.85)', marginTop: 4 }}>Dejá que la IA haga el trabajo. Vos enfocate en hacer crecer tu negocio.</div></div>
            <Btn variant="white">Empezar gratis →</Btn>
          </div>
        </Fade>
      </div>
    </Section>
  );
}

function Gracias({ toRegister }: { toRegister: () => void }) {
  const foot = [['💜', 'Hecho con pasión', 'para emprendedores como vos.'], ['🎧', 'Soporte experto', 'siempre que lo necesites.'], ['🔒', 'Tus datos están seguros', 'con encriptación de nivel empresarial.'], ['✉️', '¿Dudas o consultas?', 'Escribinos a hola@conversia.com']];
  return (
    <Section id="gracias" n={11} label="Gracias">

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }} className="lp-2col">
        <Fade>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}><Logo size={44} /><div><div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26 }}>CONVERSIA</div><div style={{ fontSize: 12, color: P.violet2, letterSpacing: '.14em' }}>ADS SUITE</div></div></div>
          <h2 style={{ ...H1, fontSize: 'clamp(32px,5vw,56px)', marginBottom: 20 }}>Gracias por llegar hasta el final<span style={{ color: P.violet2 }}>.</span></h2>
          <p style={{ color: P.muted, fontSize: 16, lineHeight: 1.6, marginBottom: 28, maxWidth: 480 }}>CONVERSIA trabaja por vos para que vos te enfoques en lo que más importa: <b style={{ color: P.violet2 }}>hacer crecer tu negocio.</b></p>
          <Btn big onClick={toRegister}>🚀 Empezar gratis ahora →</Btn>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginTop: 22 }}><Check>Sin tarjeta de crédito</Check><Check>Configuración en minutos</Check><Check>Resultados comprobados</Check></div>
        </Fade>
        <Fade delay={120}>
          <div style={{ textAlign: 'right', marginBottom: 16 }}><div style={{ fontFamily: "'Syne',sans-serif", fontStyle: 'italic', fontWeight: 700, fontSize: 20, color: P.violet2 }}>El futuro de tu negocio</div><div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26 }}>empieza ahora.</div></div>
          <AppFrame active="Inicio" title="Resumen general"><DashHome /></AppFrame>
        </Fade>
      </div>
      <Fade delay={80}><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginTop: 34, paddingTop: 30, borderTop: `1px solid ${P.border}` }}>
        {foot.map(([ic, t, d]) => <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}><span style={{ fontSize: 22 }}>{ic}</span><div><div style={{ fontWeight: 700, fontSize: 14 }}>{t}</div><div style={{ fontSize: 12.5, color: P.muted }}>{d}</div></div></div>)}
      </div></Fade>
      <div style={{ textAlign: 'center', marginTop: 40, fontSize: 12.5, color: P.dim }}>© {new Date().getFullYear()} CONVERSIA · Todos los derechos reservados</div>
    </Section>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const toRegister = () => navigate('/auth', { state: { tab: 'register' } });
  const toLogin = () => navigate('/auth', { state: { tab: 'login' } });
  return (
    <div style={{ background: P.bg, color: P.text, fontFamily: "'Inter',system-ui,sans-serif", overflowX: 'hidden' }}>
      <style>{`
        @media (max-width:860px){
          .lp-hero,.lp-2col{grid-template-columns:1fr !important}
          .lp-navlinks{display:none !important}
          .lp-floattag{display:none !important}
        }
        html{scroll-behavior:smooth}
      `}</style>
      <Hero toRegister={toRegister} toLogin={toLogin} />
      <Problema />
      <Como />
      <Inteligencia />
      <Generacion />
      <Resultados />
      <Integraciones />
      <Beneficios />
      <Testimonios />
      <Gracias toRegister={toRegister} />
    </div>
  );
}
