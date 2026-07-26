import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { YogaProvider } from './context/YogaContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicLayout from './components/PublicLayout';
import AdminLayout from './components/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';
import MetaUpdater from './components/MetaUpdater';
import { PageLoader } from './components/Skeleton';
import { Toaster } from 'sonner';

// === Lazy imports (code splitting consistente) ===
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

// === Wrapper para aplicar MetaUpdater + ErrorBoundary a cada ruta ===
function RouteWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <MetaUpdater />
      {children}
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <YogaProvider>
          <Toaster theme="dark" position="top-right" />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Root redirects to Biblioteca (landing page) */}
              <Route path="/" element={<Navigate to="/biblioteca" replace />} />

              {/* Public pages — accessible without login */}
              <Route path="/biblioteca" element={<RouteWrapper><PublicLayout><BibliotecaPage /></PublicLayout></RouteWrapper>} />
              <Route path="/nutricion" element={<RouteWrapper><PublicLayout><NutritionPage /></PublicLayout></RouteWrapper>} />
              <Route path="/acerca-de" element={<RouteWrapper><PublicLayout><AcercaDePage /></PublicLayout></RouteWrapper>} />

              {/* Auth pages — standalone, no layout */}
              <Route path="/login" element={<RouteWrapper><LoginPage /></RouteWrapper>} />
              <Route path="/register" element={<RouteWrapper><RegisterPage /></RouteWrapper>} />

              {/* Protected pages — same PublicLayout, just auth-guarded */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <RouteWrapper><PublicLayout><DashboardPage /></PublicLayout></RouteWrapper>
                </ProtectedRoute>
              } />
              <Route path="/perfil" element={
                <ProtectedRoute>
                  <RouteWrapper><PublicLayout><ProfilePage /></PublicLayout></RouteWrapper>
                </ProtectedRoute>
              } />
              <Route path="/rutinas" element={
                <ProtectedRoute>
                  <RouteWrapper><PublicLayout><RoutinesPage /></PublicLayout></RouteWrapper>
                </ProtectedRoute>
              } />
              <Route path="/comunidad" element={
                <RouteWrapper><PublicLayout><ComunidadPage /></PublicLayout></RouteWrapper>
              } />

              {/* Yoga & practice routes */}
              <Route path="/yoga/practicar/:rutinaId" element={<RouteWrapper><YogaPracticePage /></RouteWrapper>} />
              <Route path="/yoga/posiciones" element={
                <ProtectedRoute>
                  <RouteWrapper><PublicLayout><YogaPosicionesPage /></PublicLayout></RouteWrapper>
                </ProtectedRoute>
              } />
              <Route path="/rutinas/practicar/:rutinaId" element={<RouteWrapper><WorkoutPracticePage /></RouteWrapper>} />

              {/* Admin routes */}
              <Route path="/admin" element={
                <ProtectedRoute adminOnly>
                  <RouteWrapper><AdminLayout><AdminPage /></AdminLayout></RouteWrapper>
                </ProtectedRoute>
              } />
              <Route path="/admin/ejercicios" element={
                <ProtectedRoute adminOnly>
                  <RouteWrapper><AdminLayout><AdminEjerciciosPage /></AdminLayout></RouteWrapper>
                </ProtectedRoute>
              } />
              <Route path="/admin/rutinas" element={
                <ProtectedRoute adminOnly>
                  <RouteWrapper><AdminLayout><AdminRutinasPage /></AdminLayout></RouteWrapper>
                </ProtectedRoute>
              } />
              <Route path="/admin/yoga-posiciones" element={
                <ProtectedRoute adminOnly>
                  <RouteWrapper><AdminLayout><AdminYogaPosicionesPage /></AdminLayout></RouteWrapper>
                </ProtectedRoute>
              } />
              <Route path="/admin/yoga-rutinas" element={
                <ProtectedRoute adminOnly>
                  <RouteWrapper><AdminLayout><AdminYogaRutinasPage /></AdminLayout></RouteWrapper>
                </ProtectedRoute>
              } />

              {/* Catch-all → biblioteca */}
              <Route path="*" element={<Navigate to="/biblioteca" replace />} />
            </Routes>
          </Suspense>
        </YogaProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
