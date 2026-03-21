import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { insforge } from '../../lib/insforge';

export default function AdminPage() {
    const { accessToken } = useAuth();
    const [stats, setStats] = React.useState({ ejercicios: 0, rutinas: 0, usuarios: 0 });
    const [loaded, setLoaded] = React.useState(false);

    React.useEffect(() => {
        if (!accessToken) return;
        const load = async () => {
            try {
                const [e, r, p] = await Promise.all([
                    insforge.database.from('ejercicios').select('id'),
                    insforge.database.from('rutinas').select('id'),
                    insforge.database.from('perfiles').select('id'),
                ]);
                setStats({
                    ejercicios: e.data?.length || 0,
                    rutinas: r.data?.length || 0,
                    usuarios: p.data?.length || 0,
                });
                setLoaded(true);
            } catch (err) {
                console.error('Error cargando stats:', err);
            }
        };
        load();
    }, [accessToken]);

    const cards = [
        { label: 'Ejercicios', count: stats.ejercicios, icon: '💪', color: 'orange', link: '/admin/ejercicios' },
        { label: 'Rutinas', count: stats.rutinas, icon: '📋', color: 'blue', link: '/admin' },
        { label: 'Usuarios', count: stats.usuarios, icon: '👥', color: 'green', link: '/admin' },
    ];

    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Panel de <span className="text-orange-500">Administración</span></h1>
                <p className="text-gray-400 mt-1 text-sm">Gestiona el contenido de DaveFit</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
                {cards.map(c => (
                    <Link key={c.label} to={c.link} className="p-5 sm:p-6 rounded-2xl bg-[#141414] border border-white/5 hover:border-orange-500/30 transition-all group">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">{c.label}</p>
                                <p className="text-3xl sm:text-4xl font-bold text-white">{loaded ? c.count : '...'}</p>
                            </div>
                            <div className="text-3xl">{c.icon}</div>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link to="/admin/ejercicios" className="p-6 rounded-2xl bg-[#141414] border border-white/5 hover:border-orange-500/30 transition-all group flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center text-xl">💪</div>
                    <div>
                        <h3 className="font-bold text-white group-hover:text-orange-500 transition-colors">Gestionar Ejercicios</h3>
                        <p className="text-sm text-gray-500">Crear, editar y eliminar ejercicios</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
