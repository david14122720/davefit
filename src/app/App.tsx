import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';

// Lazy loaded pages for Code Splitting (optimizes bundle size and load time)
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const RoutinesPage = lazy(() => import('./pages/RoutinesPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ExercisesAdminPage = lazy(() => import('./pages/ExercisesAdminPage'));
const ComunidadPage = lazy(() => import('./pages/ComunidadPage'));

// Fallback skeleton loader while routes chunk is being fetched
const PageLoader = () => (
    <div className="flex bg-[#0a0a0a] min-h-screen items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
    </div>
);

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Toaster theme="dark" position="top-right" />
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        {/* Auth routes (sin layout) */}
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/register" element={<RegisterPage />} />

                        {/* Protected routes (con layout) */}
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

                        {/* Admin routes */}
                        <Route path="/admin" element={
                            <ProtectedRoute adminOnly>
                                <AppLayout><AdminPage /></AppLayout>
                            </ProtectedRoute>
                        } />
                        <Route path="/admin/ejercicios" element={
                            <ProtectedRoute adminOnly>
                                <AppLayout><ExercisesAdminPage /></AppLayout>
                            </ProtectedRoute>
                        } />

                        {/* Default redirect */}
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </Suspense>
            </AuthProvider>
        </BrowserRouter>
    );
}
