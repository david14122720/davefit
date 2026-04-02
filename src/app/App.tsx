import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { YogaProvider } from './context/YogaContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import AdminLayout from './components/AdminLayout';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';

import LoginPage from './pages/LoginPage';
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
import DashboardPage from './pages/DashboardPage';
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const RoutinesPage = lazy(() => import('./pages/RoutinesPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const ComunidadPage = lazy(() => import('./pages/ComunidadPage'));
const YogaPage = lazy(() => import('./pages/YogaPage'));
const YogaPracticePage = lazy(() => import('./pages/YogaPracticePage'));
const WorkoutPracticePage = lazy(() => import('./pages/WorkoutPracticePage'));
const YogaPosicionesPage = lazy(() => import('./pages/YogaPosicionesPage'));

const AdminPage = lazy(() => import('./pages/AdminPage'));
const AdminEjerciciosPage = lazy(() => import('./pages/AdminEjerciciosPage'));
const AdminRutinasPage = lazy(() => import('./pages/AdminRutinasPage'));
const AdminYogaPosicionesPage = lazy(() => import('./pages/AdminYogaPosicionesPage'));
const AdminYogaRutinasPage = lazy(() => import('./pages/AdminYogaRutinasPage'));

const PageLoader = () => (
    <div className="flex bg-[#0a0a0a] min-h-screen items-center justify-center text-white flex-col gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
        <span className="text-sm font-medium animate-pulse">Iniciando aplicación...</span>
    </div>
);

// Meta tag updater component
function MetaUpdater() {
  const location = useLocation();

  useEffect(() => {
    const metaConfig: Record<string, { title: string; description: string }> = {
      '/dashboard': {
        title: 'Dashboard',
        description: 'Tu progreso fitness personalizado. Revisa tus estadísticas, avances y objetivos semanales en DaveFit.'
      },
      '/perfil': {
        title: 'Mi Perfil',
        description: 'Gestiona tu información personal, avatar, objetivos y preferencias de entrenamiento en DaveFit.'
      },
      '/rutinas': {
        title: 'Rutinas de Ejercicios',
        description: 'Explora y gestiona tus rutinas de fitness personalizadas. Entrenamientos sin equipo para estudiantes.'
      },
      '/historial': {
        title: 'Historial de Entrenamientos',
        description: 'Revisa tu historial completo de ejercicios y sesiones de yoga. Seguimiento de tu progreso fitness.'
      },
      '/comunidad': {
        title: 'Comunidad DaveFit',
        description: 'Conéctate con otros estudiantes, comparte logros y participa en desafíos fitness.'
      },
      '/yoga': {
        title: 'Rutinas de Yoga',
        description: 'Sesiones de yoga guiadas para estudiantes. Mejora tu flexibilidad, fuerza y bienestar mental.'
      },
      '/login': {
        title: 'Iniciar Sesión',
        description: 'Accede a tu cuenta de DaveFit para continuar tu viaje fitness.'
      },
      '/register': {
        title: 'Registro',
        description: 'Crea tu cuenta gratuita en DaveFit y comienza tu transformación fitness hoy mismo.'
      },
      '/admin': {
        title: 'Panel de Administración',
        description: 'Panel de control para administradores. Gestiona ejercicios, rutinas y contenido.'
      }
    };

    const path = location.pathname;
    let meta = metaConfig[path];

    // Handle dynamic routes
    if (!meta && path.startsWith('/yoga/practicar')) {
      meta = { title: 'Practicar Yoga', description: 'Sigue una sesión de yoga en tiempo real con instrucciones paso a paso.' };
    } else if (!meta && path.startsWith('/rutinas/practicar')) {
      meta = { title: 'Practicar Rutina', description: 'Entrenamiento en progreso. Sigue los ejercicios de tu rutina personalizada.' };
    } else if (!meta && path.startsWith('/admin/')) {
      meta = { title: 'Administración', description: 'Panel de administración de DaveFit.' };
    }

    if (meta) {
      document.title = `${meta.title} | DaveFit`;

      const descriptionTag = document.querySelector('meta[name="description"]');
      if (descriptionTag) {
        descriptionTag.setAttribute('content', meta.description);
      }

      const ogTitle = document.querySelector('meta[property="og:title"]');
      const ogDescription = document.querySelector('meta[property="og:description"]');
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      const twitterDescription = document.querySelector('meta[name="twitter:description"]');

      if (ogTitle) ogTitle.setAttribute('content', `${meta.title} | DaveFit`);
      if (ogDescription) ogDescription.setAttribute('content', meta.description);
      if (twitterTitle) twitterTitle.setAttribute('content', `${meta.title} | DaveFit`);
      if (twitterDescription) twitterDescription.setAttribute('content', meta.description);
    }
  }, [location]);

  return null;
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <YogaProvider>
                    <Toaster theme="dark" position="top-right" />
                    <Suspense fallback={<PageLoader />}>
                        <Routes>
                        <Route path="/login" element={<><MetaUpdater /><LoginPage /></>} />
                        <Route path="/register" element={<><MetaUpdater /><RegisterPage /></>} />

                        <Route path="/dashboard" element={
                            <ProtectedRoute>
                                <><MetaUpdater /><AppLayout><DashboardPage /></AppLayout></>
                            </ProtectedRoute>
                        } />
                        <Route path="/perfil" element={
                            <ProtectedRoute>
                                <><MetaUpdater /><AppLayout><ProfilePage /></AppLayout></>
                            </ProtectedRoute>
                        } />
                        <Route path="/rutinas" element={
                            <ProtectedRoute>
                                <><MetaUpdater /><AppLayout><RoutinesPage /></AppLayout></>
                            </ProtectedRoute>
                        } />
                        <Route path="/historial" element={
                            <ProtectedRoute>
                                <><MetaUpdater /><AppLayout><HistoryPage /></AppLayout></>
                            </ProtectedRoute>
                        } />
                        <Route path="/comunidad" element={
                            <ProtectedRoute>
                                <><MetaUpdater /><AppLayout><ComunidadPage /></AppLayout></>
                            </ProtectedRoute>
                        } />

                        <Route path="/yoga" element={
                            <ProtectedRoute>
                                <><MetaUpdater /><AppLayout><YogaPage /></AppLayout></>
                            </ProtectedRoute>
                        } />
                        <Route path="/yoga/practicar/:rutinaId" element={
                            <ProtectedRoute>
                                <><MetaUpdater /><YogaPracticePage /></>
                            </ProtectedRoute>
                        } />
                        <Route path="/yoga/posiciones" element={
                            <ProtectedRoute>
                                <><MetaUpdater /><AppLayout><YogaPosicionesPage /></AppLayout></>
                            </ProtectedRoute>
                        } />
                        <Route path="/rutinas/practicar/:rutinaId" element={
                            <ProtectedRoute>
                                <><MetaUpdater /><WorkoutPracticePage /></>
                            </ProtectedRoute>
                        } />

                        <Route path="/admin" element={
                            <ProtectedRoute adminOnly>
                                <><MetaUpdater /><AdminLayout><AdminPage /></AdminLayout></>
                            </ProtectedRoute>
                        } />
                        <Route path="/admin/ejercicios" element={
                            <ProtectedRoute adminOnly>
                                <><MetaUpdater /><AdminLayout><AdminEjerciciosPage /></AdminLayout></>
                            </ProtectedRoute>
                        } />
                        <Route path="/admin/rutinas" element={
                            <ProtectedRoute adminOnly>
                                <><MetaUpdater /><AdminLayout><AdminRutinasPage /></AdminLayout></>
                            </ProtectedRoute>
                        } />
                        <Route path="/admin/yoga-posiciones" element={
                            <ProtectedRoute adminOnly>
                                <><MetaUpdater /><AdminLayout><AdminYogaPosicionesPage /></AdminLayout></>
                            </ProtectedRoute>
                        } />
                        <Route path="/admin/yoga-rutinas" element={
                            <ProtectedRoute adminOnly>
                                <><MetaUpdater /><AdminLayout><AdminYogaRutinasPage /></AdminLayout></>
                            </ProtectedRoute>
                        } />

                        <Route path="/" element={<Navigate to="/" replace />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </Suspense>
                </YogaProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
