import { useEffect, useState } from 'react';
import { C } from '../../styles/theme';
import { Spinner } from '../../components/ui';
import { creditsApi, type Plan, type Pack, type CreditTx } from '../../api/credits';

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

  useEffect(() => {
    creditsApi.balance().then(r => setCredits(r.credits)).catch(() => setCredits(0));
    creditsApi.history().then(r => setTxs(r.transactions)).catch(() => {});
    creditsApi.plans().then(r => setPlans(r.plans)).catch(() => {});
    creditsApi.packs().then(r => setPacks(r.packs)).catch(() => {});
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

      {/* Packs */}
      <Section title="Comprar créditos">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14 }}>
          {packs.map(p => (
            <div key={p.key} style={cardStyle}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26 }}>{p.credits}</div>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>créditos</div>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12 }}>US${p.priceUsd}</div>
              <button style={btnPrimary} title="Requiere checkout (Stripe)">Comprar</button>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: C.textDim, marginTop: 10 }}>El checkout se procesa con el billing existente (Stripe). La compra acredita automáticamente al confirmarse el pago.</p>
      </Section>

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
function Section({ title, children }: { title: string; children: any }) {
  return (
    <section style={{ marginBottom: 30 }}>
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, margin: '0 0 14px' }}>{title}</h2>
      {children}
    </section>
  );
}
