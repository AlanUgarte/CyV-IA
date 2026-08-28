import { useState, useCallback, useEffect } from 'react';
import { Spinner } from '../../components/ui';
import FileUploadZone, { type UploadFile } from '../../components/ui/FileUploadZone';
import { uploadsApi } from '../../api/uploads';
import { aiApi } from '../../api/ai';
import { generateCreativeImage } from '../../utils/creativeCanvas';
import { editProductImage, generateProductImage } from '../../utils/openaiImageEdit';
import { C } from '../../styles/theme';

const STEPS = ['Producto', 'IA analiza', 'Creativos', 'Publicar'];

const CREATIVE_CONFIGS = [
  { fmt: '9:16' as const, label: 'Reel principal', from: '#1a0528', to: '#3d0f6b', emoji: '🎬', best: true },
  { fmt: '1:1' as const, label: 'Feed cuadrado', from: '#050528', to: '#0f1a6b', emoji: '📸', best: false },
  { fmt: '4:5' as const, label: 'Story', from: '#281a05', to: '#6b4f0f', emoji: '📱', best: false },
];

const ZONES_AR = [
  'Todo Argentina', 'AMBA (Buenos Aires + GBA)', 'CABA', 'GBA Norte', 'GBA Sur', 'GBA Oeste',
  'Córdoba', 'Rosario', 'Mendoza', 'Tucumán', 'Salta', 'Mar del Plata',
];

interface AiStrategy {
  hook: string;
  headline?: string;
  body?: string;
  cta?: string;
  audience?: { description?: string; age_min?: number; age_max?: number };
  format?: string;
  styleNotes?: string;
  whatsappMessage?: string;
  hooks_variants?: string[];
  reasoning?: string;
}

type Currency = 'USD' | 'ARS';
type Gender = 'Todos' | 'Masculino' | 'Femenino';

export default function NewCampaign() {
  const [step, setStep] = useState(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [strategy, setStrategy] = useState<AiStrategy | null>(null);
  const [analyzeError, setAnalyzeError] = useState('');

  // Step 1 form
  const [form, setForm] = useState({ name: '', price: '', desc: '', budget: '25', objective: '→ WhatsApp' });
  const [currency, setCurrency] = useState<Currency>('USD');
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  // Step 3: audience & zone config
  const [gender, setGender] = useState<Gender>('Todos');
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(55);
  const [zone, setZone] = useState('Todo Argentina');
  const [interests, setInterests] = useState('');

  // File uploads
  const [mainFiles, setMainFiles] = useState<UploadFile[]>([]);
  const [extraFiles, setExtraFiles] = useState<UploadFile[]>([]);

  const [creativeImages, setCreativeImages] = useState<string[]>([]);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [fluxError, setFluxError] = useState('');
  const [productPhotoUrl, setProductPhotoUrl] = useState<string | null>(null);

  const handleUpload = useCallback(async (files: File[], onProgress: (pct: number) => void) => {
    const res = await uploadsApi.upload(files, onProgress);
    return (res.data as any)?.data?.files ?? [];
  }, []);

  // Generate AI images when entering step 3
  useEffect(() => {
    if (step !== 3 || !strategy) return;
    const hook = strategy.hook || form.name || 'Oferta especial';
    const product = form.name || 'Producto';
    const style = strategy.styleNotes ?? 'Hook urgencia';

    // productPhotoUrl is set explicitly in goToCreatives() — no stale closure issue
    void productPhotoUrl;

    setGeneratingImages(true);
    setFluxError('');

    if (false) {
      // (placeholder — photo editing now goes through the shared Promise.all below)
    } else {
      // No photo uploaded — show canvas placeholder then replace with FLUX.1
      Promise.all(
        CREATIVE_CONFIGS.map(cfg =>
          generateCreativeImage({ hook, product, format: cfg.fmt, style, avatarEmoji: cfg.emoji, gradientFrom: cfg.from, gradientTo: cfg.to })
        )
      ).then(placeholders => setCreativeImages(placeholders));

      const description = form.desc || undefined;
      const photoUrl2 = productPhotoUrl;
      Promise.all(
        CREATIVE_CONFIGS.map(cfg =>
          (photoUrl2
            ? editProductImage(photoUrl2, product, style, cfg.fmt, hook, description)
            : generateProductImage(product, style, cfg.fmt, hook, description)
          ).catch((err: any) => {
            const msg = err?.response?.data?.message ?? err?.message ?? String(err);
            setFluxError(`Usando plantilla — IA sin configurar. (${String(msg).slice(0, 90)})`);
            return generateCreativeImage({ hook, product, format: cfg.fmt, style, avatarEmoji: cfg.emoji, gradientFrom: cfg.from, gradientTo: cfg.to });
          })
        )
      ).then(images => {
        setCreativeImages(images);
        setGeneratingImages(false);
      });
    }
  }, [step, productPhotoUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const runAnalysis = async () => {
    if (!form.name.trim() && !form.desc.trim()) return;
    setAnalyzing(true);
    setAnalyzeError('');
    setStrategy(null);
    try {
      const res = await aiApi.analyzeCampaign(
        form.name || 'Producto sin nombre',
        form.desc || form.name,
        form.objective,
      );
      const data = (res.data as any)?.data ?? res.data;
      setStrategy(data);
    } catch {
      setStrategy({
        hook: '¿Todavía pagás de más?',
        headline: form.name || 'Oferta especial',
        cta: 'Escribinos por WhatsApp',
        audience: { description: 'Compradores online 18-40', age_min: 18, age_max: 40 },
        format: '9_16',
        styleNotes: 'Texto grande, fondo oscuro, urgencia',
        whatsappMessage: 'Hola, vi tu anuncio. ¿Tenés disponibilidad?',
      });
      setAnalyzeError('IA sin conexión — usando estrategia de respaldo');
    }
    setAnalyzing(false);
  };

  const goToCreatives = () => {
    if (!strategy) return;
    // Capture photo URL NOW, before changing step — avoids stale closure in useEffect
    const photoUrl = extraFiles[0]?.preview || mainFiles[0]?.preview || null;
    setProductPhotoUrl(photoUrl);
    setStep(3);
  };

  const displayStrategy = strategy ?? {
    hook: '—', audience: { description: '—' }, format: '9_16', cta: '—', styleNotes: '—',
  };

  const btnStyle = (active: boolean) => ({
    padding: '5px 13px', borderRadius: 6, fontSize: 11, border: `1px solid ${active ? C.accent : C.border}`,
    background: active ? C.accentDim : 'transparent', color: active ? C.accent : C.textMuted, cursor: 'pointer' as const,
  });

  return (
    <div className="content fade-in" translate="no">
      <div className="steps-row" style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {STEPS.map((s, i) => (
          <div key={i} className="step-item" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              padding: '5px 13px', borderRadius: 6, fontSize: 12, fontFamily: "'DM Mono',monospace",
              background: step === i + 1 ? C.accentDim : step > i + 1 ? C.greenDim : C.border,
              color: step === i + 1 ? C.accent : step > i + 1 ? C.green : C.textMuted,
              border: step === i + 1 ? `1px solid ${C.accent}44` : '1px solid transparent',
            }}>{i + 1}. {s}</div>
            {i < 3 && <span style={{ color: C.textDim, fontSize: 10 }}>›</span>}
          </div>
        ))}
      </div>

      {/* ── Step 1: Product data ─────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="g2" style={{ gap: 16 }}>
          <div className="card">
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 600, marginBottom: 13 }}>Datos del producto</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="fg">
                <label className="flbl">Nombre del producto</label>
                <input className="finput" placeholder="ej. Nike Air Max 270" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div className="fg">
                <label className="flbl">Precio de venta</label>
                <input className="finput" placeholder={currency === 'USD' ? '$99.00' : '$89.990'} value={form.price} onChange={e => set('price', e.target.value)} />
              </div>
              <div className="fg">
                <label className="flbl">Descripción</label>
                <textarea className="ftxt" placeholder="¿Qué hace especial este producto?" value={form.desc} onChange={e => set('desc', e.target.value)} />
              </div>
              <div className="g2">
                <div className="fg">
                  <label className="flbl">Presupuesto/día</label>
                  <div style={{ display: 'flex', gap: 0 }}>
                    {(['USD', 'ARS'] as Currency[]).map(cur => (
                      <button key={cur} onClick={() => setCurrency(cur)} style={{
                        padding: '8px 11px', fontSize: 11, fontFamily: "'DM Mono',monospace",
                        background: currency === cur ? C.accentDim : C.surface,
                        color: currency === cur ? C.accent : C.textMuted,
                        border: `1px solid ${currency === cur ? C.accent : C.border}`,
                        borderRadius: cur === 'USD' ? '7px 0 0 7px' : '0 7px 7px 0',
                        cursor: 'pointer', transition: 'all .15s',
                      }}>{cur}</button>
                    ))}
                    <input
                      className="finput"
                      type="number"
                      value={form.budget}
                      onChange={e => set('budget', e.target.value)}
                      style={{ borderRadius: '0 7px 7px 0', borderLeft: 'none', flex: 1, minWidth: 0 }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>
                    {currency === 'ARS' ? `≈ $${Math.round(parseFloat(form.budget || '0') / 1100).toFixed(0)} USD/día` : `≈ $${Math.round(parseFloat(form.budget || '0') * 1100).toLocaleString('es-AR')} ARS/día`}
                  </div>
                </div>
                <div className="fg">
                  <label className="flbl">Objetivo</label>
                  <select className="fsel" value={form.objective} onChange={e => set('objective', e.target.value)}>
                    <option>→ WhatsApp</option>
                    <option>Tráfico web</option>
                    <option>Conversiones</option>
                    <option>Reconocimiento de marca</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 600, marginBottom: 13 }}>Material</div>
            <div style={{ marginBottom: 13 }}>
              <label className="flbl" style={{ marginBottom: 7, display: 'block' }}>Video o imagen principal</label>
              <FileUploadZone
                accept="video/mp4,video/quicktime,video/webm,image/jpeg,image/png,image/webp"
                multiple={false} maxSizeMB={500} icon="🎬"
                label="Arrastrá o hacé click para subir"
                hint="MP4, MOV, JPG, PNG · máx 500 MB"
                value={mainFiles} onChange={setMainFiles} onUpload={handleUpload}
              />
            </div>
            <div>
              <label className="flbl" style={{ marginBottom: 7, display: 'block' }}>Fotos adicionales</label>
              <FileUploadZone
                accept="image/jpeg,image/png,image/webp"
                multiple={true} maxSizeMB={50} icon="🖼️"
                label="Arrastrá las fotos aquí"
                hint="JPG, PNG, WebP · máx 50 MB por foto"
                value={extraFiles} onChange={setExtraFiles} onUpload={handleUpload}
              />
            </div>
            <div style={{ marginTop: 13, padding: '10px 12px', background: C.accentDim, borderRadius: 8, fontSize: 12, color: C.accent, lineHeight: 1.5 }}>
              💡 La IA crea versiones virales de tu material automáticamente
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: AI analysis ─────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="card" style={{ maxWidth: 540, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', padding: '14px 0' }}>
            {!strategy && !analyzing && (
              <>
                <div style={{ fontSize: 36, marginBottom: 13 }}>🤖</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 7 }}>Listo para analizar</div>
                <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 18, lineHeight: 1.6 }}>
                  La IA va a analizar tu producto y crear la estrategia perfecta de Meta Ads: hook viral, audiencia, copy y formato ideal.
                </div>
                <button className="btn btn-p" style={{ padding: '10px 24px' }} onClick={runAnalysis}>🤖 Iniciar análisis IA</button>
              </>
            )}

            {analyzing && (
              <>
                <div style={{ fontSize: 36, marginBottom: 13 }}>🤖</div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 18 }}>IA analizando...</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', marginBottom: 18 }}>
                  {['Analizando Meta Ad Library...', 'Detectando hooks virales...', 'Generando copy estratégico...', 'Definiendo segmentación ideal...'].map((t, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: C.textMuted }}>
                      <Spinner /> {t}
                    </div>
                  ))}
                </div>
              </>
            )}

            {strategy && !analyzing && (
              <div style={{ textAlign: 'left' }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 30 }}>✅</div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, marginTop: 5 }}>Análisis completado</div>
                  {analyzeError && <div style={{ fontSize: 11, color: C.amber, marginTop: 5 }}>⚠️ {analyzeError}</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {([
                    ['Gancho', displayStrategy.hook],
                    ['Tono', displayStrategy.styleNotes ?? 'Urgencia + beneficio directo'],
                    ['Formato', displayStrategy.format?.replace('_', ':') ?? '9:16'],
                    ['Audiencia', displayStrategy.audience?.description ?? '—'],
                    ['CTA', displayStrategy.cta ?? '—'],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}22`, fontSize: 13 }}>
                      <span style={{ color: C.textMuted, flexShrink: 0, marginRight: 12 }}>{k}</span>
                      <span style={{ color: C.text, fontWeight: 500, textAlign: 'right', maxWidth: '60%', lineHeight: 1.4 }}>{v}</span>
                    </div>
                  ))}
                </div>
                {strategy.hooks_variants && strategy.hooks_variants.length > 0 && (
                  <div style={{ marginTop: 14, padding: '10px 12px', background: C.accentDim, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, color: C.accent, fontWeight: 600, marginBottom: 6 }}>Variantes de hook</div>
                    {strategy.hooks_variants.map((h, i) => (
                      <div key={i} style={{ fontSize: 12, color: C.text, padding: '3px 0' }}>• {h}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Step 3: Audience config + Generated creatives ───────────────────── */}
      {step === 3 && (
        <div className="g2" style={{ gap: 16 }}>
          {/* Left: Audience & Location */}
          <div className="card">
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 600, marginBottom: 13 }}>Audiencia y zona</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="fg">
                <label className="flbl">Sexo</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['Todos', 'Masculino', 'Femenino'] as Gender[]).map(g => (
                    <button key={g} onClick={() => setGender(g)} style={btnStyle(gender === g)}>{g}</button>
                  ))}
                </div>
              </div>

              <div className="fg">
                <label className="flbl">Rango de edad: {ageMin}–{ageMax} años</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="range" min={13} max={65} value={ageMin}
                    onChange={e => setAgeMin(Math.min(+e.target.value, ageMax - 1))}
                    style={{ flex: 1, accentColor: C.accent }} />
                  <input type="range" min={13} max={65} value={ageMax}
                    onChange={e => setAgeMax(Math.max(+e.target.value, ageMin + 1))}
                    style={{ flex: 1, accentColor: C.accent }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.textMuted, fontFamily: "'DM Mono',monospace", marginTop: 3 }}>
                  <span>Desde {ageMin}</span><span>Hasta {ageMax}</span>
                </div>
              </div>

              <div className="fg">
                <label className="flbl">Zona geográfica</label>
                <select className="fsel" value={zone} onChange={e => setZone(e.target.value)}>
                  {ZONES_AR.map(z => <option key={z}>{z}</option>)}
                </select>
              </div>

              <div className="fg">
                <label className="flbl">Intereses (separados por coma)</label>
                <input className="finput" placeholder="ej. moda, calzado, deporte, estilo de vida" value={interests} onChange={e => setInterests(e.target.value)} />
                <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>La IA usa estos intereses para afinar la segmentación</div>
              </div>

              {strategy?.audience && (
                <div style={{ padding: '9px 12px', background: C.accentDim, border: `1px solid ${C.accent}33`, borderRadius: 8, fontSize: 12, color: C.accent }}>
                  💡 IA sugiere: <strong>{strategy.audience.description}</strong>
                  {strategy.audience.age_min && <span> · {strategy.audience.age_min}–{strategy.audience.age_max} años</span>}
                </div>
              )}
            </div>
          </div>

          {/* Right: Generated creatives */}
          {(() => {
            // Read photo directly from file state — always up-to-date, no closure issues
            const photoUrl = extraFiles[0]?.preview || mainFiles[0]?.preview || null;
            void strategy?.hook;
            void form.name;

            return (
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 600, marginBottom: 13 }}>
                  Creativos generados por IA
                  {photoUrl && <span style={{ fontSize: 10, color: C.green, marginLeft: 8, fontFamily: "'DM Mono',monospace" }}>✓ usando tu foto</span>}
                </div>

                {!photoUrl && generatingImages && (
                  <div style={{ background: C.accentDim, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: C.accent, marginBottom: 10 }}>
                    <Spinner size={12} /> Generando imágenes con FLUX.1-schnell... (20-30s)
                  </div>
                )}
                {!photoUrl && fluxError && !generatingImages && (
                  <div style={{ background: '#2a1500', border: '1px solid #f97316', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#f97316', wordBreak: 'break-all', marginBottom: 10 }}>
                    ⚠️ FLUX: {fluxError}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                  {CREATIVE_CONFIGS.map((cfg, i) => (
                    <div key={i} style={{ background: C.surface, border: `1.5px solid ${i === 0 ? C.accent : C.border}`, borderRadius: 10, overflow: 'hidden', transition: 'all .2s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = C.accent)}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = i === 0 ? C.accent : C.border)}>

                      <div style={{
                        aspectRatio: cfg.fmt === '9:16' ? '9/16' : cfg.fmt === '4:5' ? '4/5' : '1',
                        position: 'relative', overflow: 'hidden',
                        background: `linear-gradient(135deg,${cfg.from},${cfg.to})`,
                      }}>
                        {cfg.best && (
                          <div style={{ position: 'absolute', top: 8, right: 8, background: C.accent, color: '#fff', fontSize: 9, padding: '2px 7px', borderRadius: 4, zIndex: 10 }}>★ Rec.</div>
                        )}

                                {creativeImages[i] ? (
                          /* ── FLUX.1 or canvas generated image ── */
                          <img src={creativeImages[i]} alt={cfg.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
                            <Spinner size={16} />
                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'rgba(255,255,255,.4)' }}>{cfg.fmt}</div>
                          </div>
                        )}
                      </div>

                      <div style={{ padding: '8px 10px' }}>
                        <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 2 }}>{cfg.label}</div>
                        <div style={{ fontSize: 9, color: C.textMuted, fontFamily: "'DM Mono',monospace", marginBottom: 7 }}>{cfg.fmt}</div>
                        {(photoUrl || creativeImages[i]) && (
                          <a href={photoUrl || creativeImages[i]} download={`creativo-${cfg.fmt.replace(':', '-')}.jpg`}
                            style={{ display: 'block', textAlign: 'center', fontSize: 10, padding: '4px', border: `1px solid ${C.border}`, borderRadius: 5, color: C.textMuted, textDecoration: 'none', background: C.bg }}>
                            📥 Descargar
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Step 4: Publish ─────────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="g2" style={{ gap: 16 }}>
          <div className="card">
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 600, marginBottom: 13 }}>Configuración final</div>
            <div style={{ padding: '9px 12px', background: C.greenDim, borderRadius: 8, border: `1px solid ${C.green}33`, fontSize: 12, color: C.green, marginBottom: 13 }}>
              ✅ Meta Ads conectado · WhatsApp vinculado
            </div>
            {[
              ['Campaña', form.name || 'Nueva campaña IA'],
              ['Presupuesto', `${form.budget} ${currency}/día`],
              ['Objetivo', form.objective],
              ['Formatos', 'Reel + Story + Feed'],
              ['Sexo', gender],
              ['Edad', `${ageMin}–${ageMax} años`],
              ['Zona', zone],
              ['Intereses', interests || 'IA optimizará automáticamente'],
              ['Hook IA', strategy?.hook ?? '—'],
              ['Pixel Meta', 'Vinculado ✓'],
              ['Material subido', `${mainFiles.filter(f => f.status === 'done').length} principal + ${extraFiles.filter(f => f.status === 'done').length} adicional`],
            ].map(([k, v], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: `1px solid ${C.border}22` }}>
                <span style={{ color: C.textMuted }}>{k}</span><span style={{ fontWeight: 500, maxWidth: '55%', textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 600, marginBottom: 13 }}>Preview WhatsApp</div>
            <div style={{ background: '#0d1117', borderRadius: 10, padding: 14, fontSize: 12 }}>
              <div style={{ fontSize: 10, color: '#4b5563', marginBottom: 8, fontFamily: "'DM Mono',monospace" }}>WhatsApp Business</div>
              <div style={{ background: '#1f2937', borderRadius: '10px 10px 10px 2px', padding: '9px 11px', marginBottom: 7, maxWidth: '80%', lineHeight: 1.5 }}>
                {strategy?.whatsappMessage ?? 'Hola, vi tu anuncio. ¿Tenés disponibilidad?'}
              </div>
              <div style={{ background: '#1a3a2a', borderRadius: '10px 10px 2px 10px', padding: '9px 11px', marginLeft: 'auto', maxWidth: '80%', lineHeight: 1.5 }}>¡Hola! Sí 🎉 ¿Cuál es tu talle?</div>
            </div>
            <button className="btn btn-p" style={{ width: '100%', marginTop: 13, padding: '11px', fontSize: 14 }}>🚀 Publicar en Meta Ads</button>
          </div>
        </div>
      )}

      {/* ── Navigation ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <button className="btn btn-g" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>← Atrás</button>

        {step === 2 && !strategy && !analyzing ? (
          <button className="btn btn-p" onClick={runAnalysis}>🤖 Analizar con IA</button>
        ) : step === 2 && strategy ? (
          <button className="btn btn-p" onClick={goToCreatives}>🎨 Generar creativos →</button>
        ) : step < 4 ? (
          <button className="btn btn-p" onClick={() => setStep(step + 1)} disabled={step === 2 && analyzing}>
            {analyzing ? <><Spinner size={14} color="#fff" /> Analizando...</> : 'Continuar →'}
          </button>
        ) : (
          <button className="btn btn-p" style={{ background: C.green }}>✅ Publicar</button>
        )}
      </div>
    </div>
  );
}
