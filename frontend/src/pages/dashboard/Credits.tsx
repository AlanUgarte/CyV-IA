import { useEffect, useRef, useState } from 'react';
import { C } from '../../styles/theme';
import { Spinner } from '../../components/ui';
import { creditsApi, type Plan, type Pack, type CreditTx, type Topup } from '../../api/credits';

const toBase64 = (file: File) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
const ST_LABEL: Record<string, { t: string; c: string }> = {
  pending: { t: 'Pendiente de aprobación', c: '#ffb347' }, approved: { t: 'Aprobado', c: '#00d68f' }, rejected: { t: 'Rechazado', c: '#ff4d6a' },
};

const OP_LABEL: Record<string, string> = {
  image_standard: 'Imagen', image_premium: 'Imagen premium',
  video_5: 'Video 5s', video_10: 'Video 10s',
  ugc_video_10: 'UGC 10s', product_video_10: 'Video producto', offer_video_10: 'Video oferta', copy: 'Copy',
};
const TX_LABEL: Record<string, string> = {
  generation: 'Generación', refund: 'Reembolso', purchase: 'Compra',
  subscription_grant: 'Plan', manual_adjustment: 'Ajuste', expiration: 'Vencimiento',
};

export default function Credits() {
  const [credits, setCredits] = useState<number | null>(null);
  const [txs, setTxs] = useState<CreditTx[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [alias, setAlias] = useState('Alan.ugarte7');
  const [topups, setTopups] = useState<Topup[]>([]);
  const [sel, setSel] = useState<Pack | null>(null);
  const [receipt, setReceipt] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadTopups = () => creditsApi.myTopups().then(r => setTopups(r.topups)).catch(() => {});
  const submitTopup = async () => {
    if (!sel) return;
    setSending(true);
    try { await creditsApi.topup(sel.key, receipt); setSel(null); setReceipt(undefined); loadTopups(); }
    catch { alert('No se pudo enviar la solicitud.'); }
    finally { setSending(false); }
  };

  useEffect(() => {
    creditsApi.balance().then(r => setCredits(r.credits)).catch(() => setCredits(0));
    creditsApi.history().then(r => setTxs(r.transactions)).catch(() => {});
    creditsApi.plans().then(r => setPlans(r.plans)).catch(() => {});
    creditsApi.packs().then(r => { setPacks(r.packs); setAlias(r.alias); }).catch(() => {});
    loadTopups();
  }, []);

  const usedThisMonth = txs.filter(t => t.type === 'generation' && new Date(t.created_at).getMonth() === new Date().getMonth())
    .reduce((a, t) => a + Math.abs(t.amount), 0);

  return (
    <div style={{ padding: '28px clamp(16px,3vw,40px)', color: C.text }}>
      <h1 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, margin: '0 0 4px' }}>Créditos</h1>
      <p style={{ color: C.textMuted, fontSize: 14, margin: '0 0 24px' }}>Gestioná tu saldo, comprá packs y revisá tu consumo.</p>

      {/* Saldo + consumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 28 }}>
        <Card>
          <div style={{ fontSize: 12, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Saldo disponible</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 40, color: C.accent, lineHeight: 1.1 }}>
            {credits ?? <Spinner size={22} />}
          </div>
          <div style={{ fontSize: 12, color: C.textMuted }}>créditos</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Consumo este mes</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 40, lineHeight: 1.1 }}>{usedThisMonth}</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>créditos usados</div>
        </Card>
        <Card>
          <div style={{ fontSize: 12, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>Generaciones</div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 40, lineHeight: 1.1 }}>{txs.filter(t => t.type === 'generation').length}</div>
          <div style={{ fontSize: 12, color: C.textMuted }}>en total</div>
        </Card>
      </div>

      {/* Comprar créditos por transferencia */}
      <Section title="Comprar créditos">
        <div style={{ ...cardStyle, background: C.accentDim, borderColor: C.borderBright, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 24 }}>🏦</div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 12, color: C.textMuted }}>Transferí al alias y subí el comprobante. El equipo lo verifica y acredita tus créditos.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 20 }}>{alias}</span>
              <button onClick={() => { navigator.clipboard?.writeText(alias); setCopied(true); setTimeout(() => setCopied(false), 1500); }} style={{ ...btnPrimary, width: 'auto', padding: '5px 12px', fontSize: 12 }}>{copied ? '✓ Copiado' : 'Copiar alias'}</button>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14 }}>
          {packs.map(p => (
            <div key={p.key} style={{ ...cardStyle, border: `2px solid ${sel?.key === p.key ? C.accent : C.border}` }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26 }}>{p.credits}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>créditos</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>US${p.priceUsd}</div>
              <button style={sel?.key === p.key ? btnPrimary : { ...btnPrimary, background: 'transparent', color: C.text, border: `1px solid ${C.border}` }} onClick={() => setSel(p)}>{sel?.key === p.key ? '✓ Elegido' : 'Elegir'}</button>
            </div>
          ))}
        </div>
      </Section>

      {/* Solicitud (subir comprobante) */}
      {sel && (
        <Overlay onClose={() => setSel(null)}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Recargar {sel.credits} créditos — US${sel.priceUsd}</div>
          <ol style={{ color: C.textMuted, fontSize: 13, paddingLeft: 18, margin: '0 0 14px', lineHeight: 1.7 }}>
            <li>Transferí <b style={{ color: C.text }}>US${sel.priceUsd}</b> al alias <b style={{ color: C.accent }}>{alias}</b>.</li>
            <li>Subí el comprobante.</li>
            <li>El equipo lo verifica y te acredita los créditos.</li>
          </ol>
          <div onClick={() => fileRef.current?.click()} style={{ border: `1.5px dashed ${C.borderBright}`, borderRadius: 12, padding: 18, textAlign: 'center', cursor: 'pointer', marginBottom: 14, background: C.surface2 }}>
            {receipt ? <span style={{ color: C.green, fontSize: 13 }}>✓ Comprobante cargado</span> : <span style={{ color: C.textMuted, fontSize: 13 }}>📎 Subir comprobante (imagen o PDF)</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden onChange={async e => e.target.files?.[0] && setReceipt(await toBase64(e.target.files[0]))} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button style={{ ...btnPrimary, width: 'auto', background: 'transparent', color: C.text, border: `1px solid ${C.border}` }} onClick={() => setSel(null)}>Cancelar</button>
            <button style={{ ...btnPrimary, width: 'auto' }} disabled={!receipt || sending} onClick={submitTopup}>{sending ? 'Enviando…' : 'Enviar solicitud'}</button>
          </div>
        </Overlay>
      )}

      {/* Mis solicitudes */}
      {topups.length > 0 && (
        <Section title="Mis recargas">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topups.map(t => {
              const st = ST_LABEL[t.status] ?? { t: t.status, c: C.textMuted };
              return (
                <div key={t.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: 14 }}>
                  <div><b>{t.credits} créditos</b> · US${t.amount_usd} <span style={{ color: C.textMuted, fontSize: 12 }}>· {new Date(t.created_at).toLocaleDateString()}</span></div>
                  <span style={{ color: st.c, fontWeight: 700, fontSize: 13 }}>{st.t}</span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Planes */}
      <Section title="Planes">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
          {plans.map(pl => (
            <div key={pl.key} style={cardStyle}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{pl.name}</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 30, color: C.accent, margin: '6px 0' }}>US${pl.priceUsd}<span style={{ fontSize: 13, color: C.textMuted }}>/mes</span></div>
              <div style={{ fontSize: 13, color: C.green, fontWeight: 600, marginBottom: 10 }}>{pl.monthlyCredits} créditos/mes</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 13, color: C.textMuted }}>
                {pl.features.map((f, i) => <li key={i} style={{ marginBottom: 4 }}>✓ {f}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* Historial */}
      <Section title="Historial de consumo">
        {txs.length === 0 ? (
          <div style={{ color: C.textMuted, fontSize: 14, padding: '20px 0' }}>Todavía no hay movimientos.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: C.textMuted, textAlign: 'left' }}>
                  <th style={th}>Fecha</th><th style={th}>Tipo</th><th style={th}>Detalle</th><th style={{ ...th, textAlign: 'right' }}>Créditos</th><th style={{ ...th, textAlign: 'right' }}>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {txs.map(t => (
                  <tr key={t.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={td}>{new Date(t.created_at).toLocaleDateString()}</td>
                    <td style={td}>{TX_LABEL[t.type] ?? t.type}</td>
                    <td style={td}>{t.operation ? (OP_LABEL[t.operation] ?? t.operation) : (t.status === 'refunded' ? 'reembolsado' : '—')}</td>
                    <td style={{ ...td, textAlign: 'right', color: t.amount < 0 ? C.red : C.green, fontWeight: 600 }}>{t.amount > 0 ? '+' : ''}{t.amount}</td>
                    <td style={{ ...td, textAlign: 'right', color: C.textMuted }}>{t.balance_after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 };
const btnPrimary: React.CSSProperties = { background: C.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer', width: '100%' };
const th: React.CSSProperties = { padding: '8px 10px', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 };
const td: React.CSSProperties = { padding: '10px' };

function Card({ children }: { children: any }) { return <div style={cardStyle}>{children}</div>; }
function Overlay({ children, onClose }: { children: any; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: '#000a', display: 'grid', placeItems: 'center', zIndex: 50, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, border: `1px solid ${C.borderBright}`, borderRadius: 16, padding: 24, maxWidth: 420, width: '100%' }}>{children}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: any }) {
  return (
    <section style={{ marginBottom: 30 }}>
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, margin: '0 0 14px' }}>{title}</h2>
      {children}
    </section>
  );
}
