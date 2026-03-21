import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import RoutinesPage from './pages/RoutinesPage';
import HistoryPage from './pages/HistoryPage';
import AdminPage from './pages/AdminPage';
import ExercisesAdminPage from './pages/ExercisesAdminPage';

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
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
            </AuthProvider>
        </BrowserRouter>
    );
}
