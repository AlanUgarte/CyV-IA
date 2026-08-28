import { useEffect, useState } from 'react';
import { C } from '../../styles/theme';
import { Spinner } from '../../components/ui';
import { creditsApi, type Topup } from '../../api/credits';

// Panel del CEO: aprobar recargas por transferencia + costos/margen de IA.
export default function AdminCredits() {
  const [pending, setPending] = useState<Topup[] | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    creditsApi.pendingTopups().then(r => setPending(r.topups)).catch(() => setPending([]));
    creditsApi.adminMetrics().then(setMetrics).catch(() => {});
  };
  useEffect(load, []);

  const approve = async (id: string) => { setBusy(id); try { await creditsApi.approveTopup(id); load(); } finally { setBusy(null); } };
  const reject = async (id: string) => { setBusy(id); try { await creditsApi.rejectTopup(id); load(); } finally { setBusy(null); } };

  const m = metrics ?? {};
  const stat = (label: string, value: any, color: string = C.text) => (
    <div style={card}><div style={{ fontSize: 11, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div><div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color }}>{value}</div></div>
  );

  return (
    <div style={{ padding: '4px 2px', color: C.text }}>
      <h2 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, margin: '0 0 4px' }}>Créditos & Costos</h2>
      <p style={{ color: C.textMuted, fontSize: 13, margin: '0 0 20px' }}>Aprobá recargas por transferencia y controlá el costo de IA.</p>

      {/* Métricas de costo / margen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: 26 }}>
        {stat('AI Cost (USD)', `$${(m.ai_cost_usd ?? 0).toFixed?.(2) ?? m.ai_cost_usd ?? 0}`, C.amber)}
        {stat('Créditos usados', m.credits_used ?? 0)}
        {stat('Imágenes', m.images ?? 0)}
        {stat('Videos', m.videos ?? 0)}
        {stat('Fallidas', m.failed ?? 0, C.red)}
        {stat('Usuarios activos', m.active_users ?? 0)}
      </div>

      {/* Recargas pendientes de aprobación */}
      <h3 style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 17, margin: '0 0 12px' }}>Recargas pendientes</h3>
      {!pending ? <Spinner size={22} /> : pending.length === 0 ? (
        <div style={{ ...card, color: C.textMuted, fontSize: 14 }}>No hay recargas pendientes. 🎉</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pending.map(t => (
            <div key={t.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 700 }}>{t.full_name} <span style={{ color: C.textMuted, fontWeight: 400, fontSize: 13 }}>· {t.email}</span></div>
                <div style={{ fontSize: 13, color: C.textMuted }}>{t.credits} créditos · US${t.amount_usd} · {new Date(t.created_at).toLocaleString()}</div>
              </div>
              {t.receipt_url && <a href={t.receipt_url} target="_blank" rel="noreferrer" style={{ color: C.blue, fontSize: 13, fontWeight: 600 }}>Ver comprobante ↗</a>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button disabled={busy === t.id} onClick={() => approve(t.id)} style={{ background: C.gradGreen, color: '#04140d', border: 'none', borderRadius: 9, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>✓ Aprobar</button>
                <button disabled={busy === t.id} onClick={() => reject(t.id)} style={{ background: 'transparent', color: C.red, border: `1px solid ${C.red}`, borderRadius: 9, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Rechazar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const card: React.CSSProperties = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 };
