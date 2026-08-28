import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Tag } from '../../components/ui';
import { C } from '../../styles/theme';

const NAV_ITEMS = [
  { path: '/admin', label: 'Overview', icon: '📊', end: true },
  { path: '/admin/users', label: 'Usuarios', icon: '👥' },
  { path: '/admin/roles', label: 'Roles & Permisos', icon: '🔐' },
  { path: '/admin/billing', label: 'Facturación', icon: '💰' },
  { path: '/admin/flags', label: 'Feature Flags', icon: '🚩' },
  { path: '/admin/audit', label: 'Audit Log', icon: '📋' },
  { path: '/admin/comms', label: 'Comunicaciones', icon: '📢' },
  { path: '/admin/system', label: 'Sistema', icon: '⚙️' },
];

export default function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string, end = false) =>
    end ? location.pathname === path : location.pathname.startsWith(path);

  const pageTitle = NAV_ITEMS.find(n =>
    n.end ? location.pathname === n.path : location.pathname.startsWith(n.path)
  )?.label ?? 'Admin';

  const [now] = useState(() => new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));

  return (
    <div className="shell">
      <aside className="aside">
        <div className="logo-area">
          <div className="logo-row">
            <div className="logo-box">AI</div>
            <div>
              <div className="logo-txt">AI Commerce Ads</div>
              <div className="logo-badge">⚡ ADMIN PANEL</div>
            </div>
          </div>
        </div>

        <nav className="nav-area">
          <div className="nav-sec">Administración</div>
          {NAV_ITEMS.slice(0, 4).map(n => (
            <button key={n.path} className={`nav-item${isActive(n.path, n.end) ? ' act' : ''}`} onClick={() => navigate(n.path)}>
              <span className="nav-ic">{n.icon}</span>{n.label}
            </button>
          ))}
          <div className="nav-sec" style={{ marginTop: 8 }}>Sistema</div>
          {NAV_ITEMS.slice(4).map(n => (
            <button key={n.path} className={`nav-item${isActive(n.path) ? ' act' : ''}`} onClick={() => navigate(n.path)}>
              <span className="nav-ic">{n.icon}</span>{n.label}
            </button>
          ))}
          <button className="nav-item" onClick={() => navigate('/dashboard')} style={{ marginTop: 8 }}>
            <span className="nav-ic">🏠</span>Dashboard
          </button>
          <button className="nav-item" onClick={logout}>
            <span className="nav-ic">🚪</span>Cerrar sesión
          </button>
        </nav>

        <div className="admin-profile">
          <div className="avatar">{user?.fullName?.[0] ?? 'A'}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.fullName ?? 'Admin'}</div>
            <div style={{ fontSize: 10, color: C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
          <Tag t="tr">ADMIN</Tag>
        </div>
      </aside>

      <div className="main-col">
        <div className="topbar">
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, flex: 1 }}>{pageTitle}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: C.textMuted, fontFamily: "'DM Mono',monospace", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 11px' }}>
            🔴 LIVE &nbsp;·&nbsp; {now}
          </div>
          <div style={{ fontSize: 12, color: C.green, fontFamily: "'DM Mono',monospace" }}>● Sistema OK</div>
          <button className="btn btn-g" style={{ fontSize: 12, padding: '6px 11px' }}>🔔</button>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
