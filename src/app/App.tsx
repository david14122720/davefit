import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <YogaProvider>
                    <Toaster theme="dark" position="top-right" />
                    <Suspense fallback={<PageLoader />}>
                        <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />

                        <Route path="/dashboard" element={
                            <ProtectedRoute>
                                <AppLayout><DashboardPage /></AppLayout>
                            </ProtectedRoute>
                        } />
                        <Route path="/perfil" element={
                            <ProtectedRoute>
                                <AppLayout><ProfilePage /></AppLayout>
                            </ProtectedRoute>
                        } />
                        <Route path="/rutinas" element={
                            <ProtectedRoute>
                                <AppLayout><RoutinesPage /></AppLayout>
                            </ProtectedRoute>
                        } />
                        <Route path="/historial" element={
                            <ProtectedRoute>
                                <AppLayout><HistoryPage /></AppLayout>
                            </ProtectedRoute>
                        } />
                        <Route path="/comunidad" element={
                            <ProtectedRoute>
                                <AppLayout><ComunidadPage /></AppLayout>
                            </ProtectedRoute>
                        } />

                        <Route path="/yoga" element={
                            <ProtectedRoute>
                                <AppLayout><YogaPage /></AppLayout>
                            </ProtectedRoute>
                        } />
                        <Route path="/yoga/practicar/:rutinaId" element={
                            <ProtectedRoute>
                                <YogaPracticePage />
                            </ProtectedRoute>
                        } />
                        <Route path="/yoga/posiciones" element={
                            <ProtectedRoute>
                                <AppLayout><YogaPosicionesPage /></AppLayout>
                            </ProtectedRoute>
                        } />
                        <Route path="/rutinas/practicar/:rutinaId" element={
                            <ProtectedRoute>
                                <WorkoutPracticePage />
                            </ProtectedRoute>
                        } />

                        <Route path="/admin" element={
                            <ProtectedRoute adminOnly>
                                <AdminLayout><AdminPage /></AdminLayout>
                            </ProtectedRoute>
                        } />
                        <Route path="/admin/ejercicios" element={
                            <ProtectedRoute adminOnly>
                                <AdminLayout><AdminEjerciciosPage /></AdminLayout>
                            </ProtectedRoute>
                        } />
                        <Route path="/admin/rutinas" element={
                            <ProtectedRoute adminOnly>
                                <AdminLayout><AdminRutinasPage /></AdminLayout>
                            </ProtectedRoute>
                        } />
                        <Route path="/admin/yoga-posiciones" element={
                            <ProtectedRoute adminOnly>
                                <AdminLayout><AdminYogaPosicionesPage /></AdminLayout>
                            </ProtectedRoute>
                        } />
                        <Route path="/admin/yoga-rutinas" element={
                            <ProtectedRoute adminOnly>
                                <AdminLayout><AdminYogaRutinasPage /></AdminLayout>
                            </ProtectedRoute>
                        } />

                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </Suspense>
                </YogaProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
