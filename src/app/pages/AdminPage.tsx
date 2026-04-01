import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
    Dumbbell, 
    ListTodo, 
    Sparkles, 
    TrendingUp,
    Users,
    Calendar,
    Plus,
    ArrowRight
} from 'lucide-react';
import adminApi from '../lib/adminApi';

const statCards = [
    { 
        label: 'Ejercicios', 
        icon: Dumbbell, 
        color: 'orange', 
        link: '/admin/ejercicios',
        key: 'ejercicios'
    },
    { 
        label: 'Rutinas', 
        icon: ListTodo, 
        color: 'blue', 
        link: '/admin/rutinas',
        key: 'rutinas'
    },
    { 
        label: 'Yoga Posiciones', 
        icon: Sparkles, 
        color: 'purple', 
        link: '/admin/yoga-posiciones',
        key: 'yogaPosiciones'
    },
    { 
        label: 'Yoga Rutinas', 
        icon: Calendar, 
        color: 'green', 
        link: '/admin/yoga-rutinas',
        key: 'yogaRutinas'
    },
];

const colorClasses: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-500', icon: 'bg-orange-500/20' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-500', icon: 'bg-blue-500/20' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-500', icon: 'bg-purple-500/20' },
    green: { bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-500', icon: 'bg-green-500/20' },
};

export default function AdminPage() {
    const [stats, setStats] = useState({
        ejercicios: 0,
        rutinas: 0,
        yogaPosiciones: 0,
        yogaRutinas: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await adminApi.getStats();
                setStats(data);
            } catch (err) {
                console.error('[Admin] Error loading stats:', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-extrabold text-white mb-2">
                    Panel de <span className="text-orange-500">Administración</span>
                </h1>
                <p className="text-gray-400">Gestiona todo el contenido de DaveFit</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    const colors = colorClasses[card.color];
                    return (
                        <Link
                            key={card.key}
                            to={card.link}
                            className="p-6 rounded-2xl bg-[#141414] border border-white/5 hover:border-orange-500/30 transition-all group"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className={`w-12 h-12 rounded-xl ${colors.icon} flex items-center justify-center`}>
                                    <Icon className={`w-6 h-6 ${colors.text}`} />
                                </div>
                                <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                            </div>
                            <p className="text-gray-400 text-sm mb-1">{card.label}</p>
                            <p className="text-3xl font-bold text-white">
                                {loading ? '...' : stats[card.key as keyof typeof stats]}
                            </p>
                        </Link>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link 
                    to="/admin/ejercicios" 
                    className="p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 hover:border-orange-500/40 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-orange-500/20 flex items-center justify-center">
                            <Dumbbell className="w-7 h-7 text-orange-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white group-hover:text-orange-500 transition-colors">
                                Gestionar Ejercicios
                            </h3>
                            <p className="text-sm text-gray-400">Crea, edita y elimina ejercicios</p>
                        </div>
                    </div>
                </Link>

                <Link 
                    to="/admin/rutinas" 
                    className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 hover:border-blue-500/40 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <ListTodo className="w-7 h-7 text-blue-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white group-hover:text-blue-500 transition-colors">
                                Gestionar Rutinas
                            </h3>
                            <p className="text-sm text-gray-400">Administra las rutinas de entrenamiento</p>
                        </div>
                    </div>
                </Link>

                <Link 
                    to="/admin/yoga-posiciones" 
                    className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 hover:border-purple-500/40 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center">
                            <Sparkles className="w-7 h-7 text-purple-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white group-hover:text-purple-500 transition-colors">
                                Gestionar Yoga Posiciones
                            </h3>
                            <p className="text-sm text-gray-400">Administra las posiciones de yoga</p>
                        </div>
                    </div>
                </Link>

                <Link 
                    to="/admin/yoga-rutinas" 
                    className="p-6 rounded-2xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 hover:border-green-500/40 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center">
                            <Calendar className="w-7 h-7 text-green-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white group-hover:text-green-500 transition-colors">
                                Gestionar Yoga Rutinas
                            </h3>
                            <p className="text-sm text-gray-400">Administra las rutinas de yoga</p>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
