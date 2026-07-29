import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Dumbbell,
    ListTodo,
    Sparkles,
    LayoutGrid,
    ArrowLeft,
    LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdminLayoutProps {
    children: React.ReactNode;
}

const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutGrid },
    { path: '/admin/ejercicios', label: 'Ejercicios', icon: Dumbbell },
    { path: '/admin/rutinas', label: 'Rutinas', icon: ListTodo },
    { path: '/admin/yoga-posiciones', label: 'Yoga Posiciones', icon: Sparkles },
    { path: '/admin/yoga-rutinas', label: 'Yoga Rutinas', icon: Sparkles },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
    const location = useLocation();
    const { signOut, user } = useAuth();

    return (
        <div className="flex min-h-screen bg-[#0a0a0a]">
            {/* Sidebar */}
            <aside className="w-64 bg-[#0d0d0d] border-r border-white/5 flex flex-col">
                {/* Logo */}
                <div className="p-5 border-b border-white/5">
                    <Link to="/dashboard" className="flex items-center gap-2 text-white hover:text-primary transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="font-bold text-sm">Volver a DaveFit</span>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path || 
                            (item.path !== '/admin' && location.pathname.startsWith(item.path));
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                    isActive 
                                        ? 'bg-primary/10 text-primary border border-primary/20' 
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                <Icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-3 mb-3 px-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                            {user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                            <p className="text-xs text-primary">Admin</p>
                        </div>
                    </div>
                    <button
                        onClick={signOut}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
