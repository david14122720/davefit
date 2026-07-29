import React, { Suspense, lazy, type ComponentType } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { YogaProvider } from './context/YogaContext';
import ProtectedRouteGuard from './components/ProtectedRoute';
import PublicLayout from './components/PublicLayout';
import AdminLayout from './components/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';
import MetaUpdater from './components/MetaUpdater';
import { PageLoader } from './components/Skeleton';
import { Toaster } from 'sonner';

// ============================================================
// Lazy imports (code splitting)
// ============================================================
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const BibliotecaPage = lazy(() => import('./pages/BibliotecaPage'));
const NutritionPage = lazy(() => import('./pages/NutritionPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const RoutinesPage = lazy(() => import('./pages/RoutinesPage'));
const ComunidadPage = lazy(() => import('./pages/ComunidadPage'));
const AcercaDePage = lazy(() => import('./pages/AcercaDePage'));
const YogaPracticePage = lazy(() => import('./pages/YogaPracticePage'));
const WorkoutPracticePage = lazy(() => import('./pages/WorkoutPracticePage'));
const YogaPosicionesPage = lazy(() => import('./pages/YogaPosicionesPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const AdminEjerciciosPage = lazy(() => import('./pages/AdminEjerciciosPage'));
const AdminRutinasPage = lazy(() => import('./pages/AdminRutinasPage'));
const AdminYogaPosicionesPage = lazy(() => import('./pages/AdminYogaPosicionesPage'));
const AdminYogaRutinasPage = lazy(() => import('./pages/AdminYogaRutinasPage'));

// ============================================================
// Route config — fuente única de verdad para el enrutamiento
// ============================================================

type GuardType = 'auth' | 'admin';
type LayoutType = 'public' | 'admin';

interface RouteDef {
  path: string;
  page: ComponentType<any>;
  guard?: GuardType;
  layout?: LayoutType;
}

// Wrapper: añade ErrorBoundary + MetaUpdater a cada ruta
function RouteWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <MetaUpdater />
      {children}
    </ErrorBoundary>
  );
}

function renderRoute({ path, page: Page, guard, layout }: RouteDef) {
  // Construir contenido desde adentro hacia afuera
  let content: React.ReactNode = <Page />;

  // Layout externo
  if (layout === 'public') content = <PublicLayout>{content}</PublicLayout>;
  if (layout === 'admin') content = <AdminLayout>{content}</AdminLayout>;

  // ErrorBoundary + meta tags envuelven todo
  content = <RouteWrapper>{content}</RouteWrapper>;

  // Guard opcional
  if (guard === 'auth') content = <ProtectedRouteGuard>{content}</ProtectedRouteGuard>;
  if (guard === 'admin') content = <ProtectedRouteGuard adminOnly>{content}</ProtectedRouteGuard>;

  return <Route key={path} path={path} element={content} />;
}

const routes: RouteDef[] = [
  // Públicas (con layout compartido)
  { path: '/biblioteca', page: BibliotecaPage, layout: 'public' },
  { path: '/nutricion', page: NutritionPage, layout: 'public' },
  { path: '/acerca-de', page: AcercaDePage, layout: 'public' },
  { path: '/comunidad', page: ComunidadPage, layout: 'public' },

  // Auth (sin layout)
  { path: '/login', page: LoginPage },
  { path: '/register', page: RegisterPage },

  // Protegidas (auth + layout público)
  { path: '/dashboard', page: DashboardPage, guard: 'auth', layout: 'public' },
  { path: '/perfil', page: ProfilePage, guard: 'auth', layout: 'public' },
  { path: '/rutinas', page: RoutinesPage, guard: 'auth', layout: 'public' },
  { path: '/yoga/posiciones', page: YogaPosicionesPage, guard: 'auth', layout: 'public' },

  // Práctica (auth requerida: registra progreso en historial_ejercicios
  // y persiste XP/gamificación con user_id del usuario autenticado)
  { path: '/yoga/practicar/:rutinaId', page: YogaPracticePage, guard: 'auth', layout: 'public' },
  { path: '/rutinas/practicar/:rutinaId', page: WorkoutPracticePage, guard: 'auth', layout: 'public' },

  // Admin (admin guard + admin layout)
  { path: '/admin', page: AdminPage, guard: 'admin', layout: 'admin' },
  { path: '/admin/ejercicios', page: AdminEjerciciosPage, guard: 'admin', layout: 'admin' },
  { path: '/admin/rutinas', page: AdminRutinasPage, guard: 'admin', layout: 'admin' },
  { path: '/admin/yoga-posiciones', page: AdminYogaPosicionesPage, guard: 'admin', layout: 'admin' },
  { path: '/admin/yoga-rutinas', page: AdminYogaRutinasPage, guard: 'admin', layout: 'admin' },
];

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <YogaProvider>
          <Toaster theme="dark" position="top-right" />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Root redirect */}
              <Route path="/" element={<Navigate to="/biblioteca" replace />} />

              {/* Renderizar rutas configuradas */}
              {routes.map(renderRoute)}

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/biblioteca" replace />} />
            </Routes>
          </Suspense>
        </YogaProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
