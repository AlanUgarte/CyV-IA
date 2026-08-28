import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense, Component, type ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from '../components/ui';

// ── Eager (tiny, needed before auth) ─────────────────────────────────────────
import LandingPage from '../pages/LandingPage';
import AuthPage from '../pages/AuthPage';

// Wraps lazy() so a failed chunk load (stale Vercel CDN cache) reloads the
// page once instead of crashing with "módulo importado dinámicamente".
function lazyLoad<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
): React.LazyExoticComponent<T> {
  return lazy(() =>
    factory().catch(() => {
      window.location.reload();
      return new Promise<never>(() => {});
    }),
  );
}

// ── Lazy loaded (split by route) ──────────────────────────────────────────────
const CheckoutPage    = lazyLoad(() => import('../pages/CheckoutPage'));
const SuccessPage     = lazyLoad(() => import('../pages/SuccessPage'));

const DashShell       = lazyLoad(() => import('../pages/dashboard/DashShell'));
const DashOverview    = lazyLoad(() => import('../pages/dashboard/DashOverview'));
const Campaigns       = lazyLoad(() => import('../pages/dashboard/Campaigns'));
const NewCampaign     = lazyLoad(() => import('../pages/dashboard/NewCampaign'));
const Creatives       = lazyLoad(() => import('../pages/dashboard/Creatives'));
const Reports         = lazyLoad(() => import('../pages/dashboard/Reports'));
const Integrations    = lazyLoad(() => import('../pages/dashboard/Integrations'));
const Billing         = lazyLoad(() => import('../pages/dashboard/Billing'));
const Profile         = lazyLoad(() => import('../pages/dashboard/Profile'));

const AdminShell      = lazyLoad(() => import('../pages/admin/AdminShell'));
const AdminOverview   = lazyLoad(() => import('../pages/admin/AdminOverview'));
const AdminUsers      = lazyLoad(() => import('../pages/admin/AdminUsers'));
const AdminRoles      = lazyLoad(() => import('../pages/admin/AdminRoles'));
const AdminBilling    = lazyLoad(() => import('../pages/admin/AdminBilling'));
const AdminFlags      = lazyLoad(() => import('../pages/admin/AdminFlags'));
const AdminAudit      = lazyLoad(() => import('../pages/admin/AdminAudit'));
const AdminComms      = lazyLoad(() => import('../pages/admin/AdminComms'));
const AdminSystem     = lazyLoad(() => import('../pages/admin/AdminSystem'));

// ── Suspense / loading ────────────────────────────────────────────────────────
function Fallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#07070f' }}>
      <Spinner size={28} />
    </div>
  );
}

function S({ children }: { children: ReactNode }) {
  return <Suspense fallback={<Fallback />}>{children}</Suspense>;
}

// ── Error boundary — catches any render-time crash and reloads ────────────────
interface EBState { error: boolean }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: false };

  static getDerivedStateFromError(): EBState {
    return { error: true };
  }

  componentDidCatch(err: Error) {
    const msg = err?.message ?? '';
    if (
      msg.includes('dynamically imported') ||
      msg.includes('módulo importado') ||
      msg.includes('ChunkLoadError') ||
      msg.includes('Failed to fetch')
    ) {
      window.location.reload();
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#07070f', gap: 16 }}>
          <Spinner size={28} />
          <div style={{ fontSize: 13, color: '#5a5a80', fontFamily: 'monospace' }}>Actualizando...</div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Guards ────────────────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Fallback />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <Fallback />;
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'support') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// ── Router ────────────────────────────────────────────────────────────────────
export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/auth', element: <AuthPage /> },
  { path: '/checkout', element: <ErrorBoundary><S><CheckoutPage /></S></ErrorBoundary> },
  { path: '/success',  element: <ErrorBoundary><S><SuccessPage /></S></ErrorBoundary> },

  {
    path: '/dashboard',
    element: <RequireAuth><ErrorBoundary><S><DashShell /></S></ErrorBoundary></RequireAuth>,
    children: [
      { index: true,         element: <ErrorBoundary><S><DashOverview /></S></ErrorBoundary> },
      { path: 'campaigns',   element: <ErrorBoundary><S><Campaigns /></S></ErrorBoundary> },
      { path: 'new-campaign',element: <ErrorBoundary><S><NewCampaign /></S></ErrorBoundary> },
      { path: 'creatives',   element: <ErrorBoundary><S><Creatives /></S></ErrorBoundary> },
      { path: 'reports',     element: <ErrorBoundary><S><Reports /></S></ErrorBoundary> },
      { path: 'integrations',element: <ErrorBoundary><S><Integrations /></S></ErrorBoundary> },
      { path: 'billing',     element: <ErrorBoundary><S><Billing /></S></ErrorBoundary> },
      { path: 'profile',     element: <ErrorBoundary><S><Profile /></S></ErrorBoundary> },
    ],
  },

  {
    path: '/admin',
    element: <RequireAdmin><ErrorBoundary><S><AdminShell /></S></ErrorBoundary></RequireAdmin>,
    children: [
      { index: true,          element: <ErrorBoundary><S><AdminOverview /></S></ErrorBoundary> },
      { path: 'users',        element: <ErrorBoundary><S><AdminUsers /></S></ErrorBoundary> },
      { path: 'roles',        element: <ErrorBoundary><S><AdminRoles /></S></ErrorBoundary> },
      { path: 'billing',      element: <ErrorBoundary><S><AdminBilling /></S></ErrorBoundary> },
      { path: 'flags',        element: <ErrorBoundary><S><AdminFlags /></S></ErrorBoundary> },
      { path: 'audit',        element: <ErrorBoundary><S><AdminAudit /></S></ErrorBoundary> },
      { path: 'comms',        element: <ErrorBoundary><S><AdminComms /></S></ErrorBoundary> },
      { path: 'system',       element: <ErrorBoundary><S><AdminSystem /></S></ErrorBoundary> },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
]);
